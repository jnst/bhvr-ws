# API仕様

## アーキテクチャ概要

```
[ブラウザ] ↔ [WebSocket Server] ↔ [Redis]
                     ↓
               [Redis Pub/Sub]
                     ↓
           [他のWebSocket Server]
```

- **REST API**: 基本的なCRUD操作（Redis直接操作）
- **WebSocket**: Redis Pub/Subの中継層として機能
- **Redis Pub/Sub**: サーバー間のリアルタイム同期

## REST API

### 投票管理API

#### 投票作成
```
POST /api/polls
Content-Type: application/json

Request Body:
{
  "question": "今日のランチは？",
  "options": ["寿司", "ラーメン", "パスタ"],
  "duration": 300
}

Response:
{
  "id": "poll-123",
  "question": "今日のランチは？",
  "options": [
    { "id": "opt-1", "text": "寿司" },
    { "id": "opt-2", "text": "ラーメン" },
    { "id": "opt-3", "text": "パスタ" }
  ],
  "duration": 300,
  "status": "active",
  "createdAt": "2025-01-15T10:00:00Z",
  "expiresAt": "2025-01-15T10:05:00Z"
}

Redis操作:
SET poll:123 '{"question":"今日のランチは？",...}'
EXPIRE poll:123 300
```

#### 投票取得
```
GET /api/polls/{pollId}

Response:
{
  "id": "poll-123",
  "question": "今日のランチは？",
  "options": [
    { "id": "opt-1", "text": "寿司" },
    { "id": "opt-2", "text": "ラーメン" },
    { "id": "opt-3", "text": "パスタ" }
  ],
  "duration": 300,
  "status": "active",
  "createdAt": "2025-01-15T10:00:00Z",
  "expiresAt": "2025-01-15T10:05:00Z",
  "participantCount": 18,
  "remainingTime": 180
}

Redis操作:
GET poll:123
SCARD poll:123:participants
TTL poll:123
```

#### 投票実行
```
POST /api/polls/{pollId}/vote
Content-Type: application/json

Request Body:
{
  "optionId": "opt-1"
}

Response:
{
  "success": true,
  "votedOptionId": "opt-1",
  "message": "投票が完了しました"
}

Redis操作:
HINCRBY poll:123:votes opt-1 1
SADD poll:123:participants {userId}
PUBLISH poll:123:updates '{"type":"VOTE_CAST","optionId":"opt-1"}'
```

#### 投票結果取得
```
GET /api/polls/{pollId}/results

Response:
{
  "pollId": "poll-123",
  "question": "今日のランチは？",
  "results": [
    {
      "optionId": "opt-1",
      "text": "寿司",
      "votes": 8,
      "percentage": 44.4
    },
    {
      "optionId": "opt-2",
      "text": "ラーメン",
      "votes": 6,
      "percentage": 33.3
    },
    {
      "optionId": "opt-3",
      "text": "パスタ",
      "votes": 4,
      "percentage": 22.2
    }
  ],
  "totalVotes": 18,
  "status": "active",
  "remainingTime": 180
}

Redis操作:
HGETALL poll:123:votes
GET poll:123
TTL poll:123
```

### エラーレスポンス
```
HTTP 400 Bad Request
{
  "error": "INVALID_REQUEST",
  "message": "投票質問は必須です"
}

HTTP 404 Not Found
{
  "error": "POLL_NOT_FOUND",
  "message": "指定された投票が見つかりません"
}

HTTP 409 Conflict
{
  "error": "ALREADY_VOTED",
  "message": "既に投票済みです"
}

HTTP 410 Gone
{
  "error": "POLL_EXPIRED",
  "message": "投票期間が終了しています"
}
```

## WebSocket API

### 接続エンドポイント
```
ws://localhost:3000/ws/polls/{pollId}
```

### Redis Pub/Sub 中継の仕組み

#### 投票実行フロー
1. クライアント → WebSocket → サーバー
2. サーバー → Redis (投票データ保存)
3. サーバー → Redis Pub/Sub (イベント発行)
4. 他のサーバー → Redis Pub/Sub (イベント受信)
5. サーバー → WebSocket → 全クライアント (結果配信)

```javascript
// サーバー側の実装例
redis.subscribe(`poll:${pollId}:updates`);
redis.on('message', (channel, message) => {
  const event = JSON.parse(message);
  // 接続中のWebSocketクライアントに配信
  broadcastToClients(pollId, event);
});
```

### メッセージフォーマット
```json
{
  "type": "MESSAGE_TYPE",
  "data": { /* payload */ },
  "timestamp": "2025-01-15T10:00:00Z"
}
```

### クライアント → サーバー

#### 投票参加
```json
{
  "type": "JOIN_POLL",
  "data": {
    "pollId": "poll-123"
  }
}
```

#### 投票実行
```json
{
  "type": "CAST_VOTE",
  "data": {
    "optionId": "opt-1"
  }
}
```

#### ハートビート
```json
{
  "type": "PING",
  "data": {}
}
```

### サーバー → クライアント

#### 接続確認
```json
{
  "type": "CONNECTION_ESTABLISHED",
  "data": {
    "pollId": "poll-123",
    "participantCount": 18
  }
}
```

#### 投票状況更新（Redis Pub/Sub経由）
```json
{
  "type": "POLL_UPDATE",
  "data": {
    "participantCount": 19,
    "remainingTime": 180
  }
}
```

#### 投票結果更新（Redis Pub/Sub経由）
```json
{
  "type": "RESULTS_UPDATE",
  "data": {
    "results": [
      {
        "optionId": "opt-1",
        "text": "寿司",
        "votes": 8,
        "percentage": 44.4
      },
      {
        "optionId": "opt-2",
        "text": "ラーメン",
        "votes": 6,
        "percentage": 33.3
      },
      {
        "optionId": "opt-3",
        "text": "パスタ",
        "votes": 4,
        "percentage": 22.2
      }
    ],
    "totalVotes": 18
  }
}
```

#### 投票完了通知
```json
{
  "type": "VOTE_CONFIRMED",
  "data": {
    "votedOptionId": "opt-1",
    "message": "投票が完了しました"
  }
}
```

#### 投票終了通知（Redis Pub/Sub経由）
```json
{
  "type": "POLL_ENDED",
  "data": {
    "reason": "TIME_EXPIRED",
    "finalResults": [
      {
        "optionId": "opt-1",
        "text": "寿司",
        "votes": 8,
        "percentage": 44.4
      },
      {
        "optionId": "opt-2",
        "text": "ラーメン",
        "votes": 6,
        "percentage": 33.3
      },
      {
        "optionId": "opt-3",
        "text": "パスタ",
        "votes": 4,
        "percentage": 22.2
      }
    ]
  }
}
```

#### エラー通知
```json
{
  "type": "ERROR",
  "data": {
    "code": "ALREADY_VOTED",
    "message": "既に投票済みです"
  }
}
```

#### ハートビート応答
```json
{
  "type": "PONG",
  "data": {}
}
```

### 接続状態管理

#### 正常切断
```json
{
  "type": "DISCONNECT",
  "data": {
    "reason": "CLIENT_INITIATED"
  }
}
```

#### 異常切断検知
- クライアント側: WebSocket `onclose` イベントで自動再接続
- サーバー側: Ping/Pong タイムアウトで接続削除
- Redis Pub/Sub: 購読状態は自動で削除される

## Redis Pub/Sub チャンネル設計

### チャンネル名
```
poll:{pollId}:updates  // 投票更新イベント
poll:{pollId}:system   // システムイベント（終了等）
```

### 発行されるイベント
```json
// 投票実行時
{
  "type": "VOTE_CAST",
  "pollId": "poll-123",
  "optionId": "opt-1",
  "timestamp": "2025-01-15T10:00:00Z"
}

// 投票終了時
{
  "type": "POLL_ENDED",
  "pollId": "poll-123",
  "reason": "TIME_EXPIRED",
  "timestamp": "2025-01-15T10:00:00Z"
}
```

## データ型定義

### Poll
```typescript
interface Poll {
  id: string;
  question: string;
  options: Option[];
  duration: number; // seconds
  status: 'active' | 'ended';
  createdAt: string; // ISO 8601
  expiresAt: string; // ISO 8601
  participantCount: number;
  remainingTime: number; // seconds
}
```

### Option
```typescript
interface Option {
  id: string;
  text: string;
}
```

### VoteResult
```typescript
interface VoteResult {
  optionId: string;
  text: string;
  votes: number;
  percentage: number;
}
```

### WebSocketMessage
```typescript
interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string; // ISO 8601
}
```

## スケーラビリティ

### 水平スケーリング
- 複数のWebSocketサーバーインスタンス
- Redis Pub/Subによる自動同期
- ロードバランサーでの負荷分散

### パフォーマンス最適化
- Redis のメモリ最適化
- WebSocket接続のプール管理
- Pub/Sub チャンネルの効率的な購読

### 高可用性
- Redis Cluster または Redis Sentinel
- WebSocketサーバーの冗長化
- 障害時の自動フェイルオーバー

## 認証・セキュリティ

### セッション管理
- REST API: セッションCookieまたはJWT
- WebSocket: 接続時にトークン検証
- Redis: セッション情報の永続化

### レート制限
- REST API: 投票作成 1回/分、投票実行 1回/投票
- WebSocket: メッセージ送信 10回/秒
- Redis: IP別のレート制限カウンター

### CORS設定
```
Access-Control-Allow-Origin: https://yourdomain.com
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

### Redis セキュリティ
```
# Redis設定例
requirepass your_redis_password
bind 127.0.0.1
protected-mode yes
```