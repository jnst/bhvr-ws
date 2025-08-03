# API仕様

## 概要

このAPI仕様書は「doc/requirements.md」で定義されたリアルタイム投票サービスのAPI設計を記述します。

## アーキテクチャ概要

```
[Client] ↔ [REST API] ↔ [Database]
           ↓
      [WebSocket API]
           ↓
    [Real-time Updates]
```

- **REST API**: 投票のCRUD操作（作成、取得、投票実行）
- **WebSocket API**: リアルタイム結果更新と通知
- **Database**: 投票データの永続化

## REST API

### 投票管理API

以下のAPIは「requirements.md」の要件に基づいて設計されています。

#### 投票作成

**要件対応**: 要件 1 - 投票作成機能

```
POST /api/polls
Content-Type: application/json

Request Body:
{
  "title": "今日のランチは？",
  "options": ["寿司", "ラーメン", "パスタ"]
}

Validation:
- title: 必須、空文字不可
- options: 最低2個、最大10個まで

Response (201 Created):
{
  "success": true,
  "data": {
    "id": "poll-123",
    "title": "今日のランチは？",
    "options": [
      { "id": "opt-1", "text": "寿司", "votes": 0, "percentage": 0 },
      { "id": "opt-2", "text": "ラーメン", "votes": 0, "percentage": 0 },
      { "id": "opt-3", "text": "パスタ", "votes": 0, "percentage": 0 }
    ],
    "status": "active",
    "createdAt": "2025-01-26T10:00:00Z",
    "createdBy": "user-456",
    "totalVotes": 0,
    "pollUrl": "/poll/poll-123",
    "adminUrl": "/admin/poll-123"
  }
}

Error Response (400 Bad Request):
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "質問文は必須です",
    "details": {
      "field": "title",
      "received": ""
    }
  }
}
```

#### 投票取得

**要件対応**: 要件 2 - 投票参加機能

```
GET /api/polls/{pollId}

Response (200 OK):
{
  "success": true,
  "data": {
    "id": "poll-123",
    "title": "今日のランチは？",
    "options": [
      { "id": "opt-1", "text": "寿司", "votes": 5, "percentage": 27.8 },
      { "id": "opt-2", "text": "ラーメン", "votes": 8, "percentage": 44.4 },
      { "id": "opt-3", "text": "パスタ", "votes": 5, "percentage": 27.8 }
    ],
    "status": "active",
    "createdAt": "2025-01-26T10:00:00Z",
    "createdBy": "user-456",
    "totalVotes": 18
  }
}

Error Response (404 Not Found):
{
  "success": false,
  "error": {
    "code": "POLL_NOT_FOUND",
    "message": "指定された投票が見つかりません"
  }
}
```

#### 投票実行

**要件対応**: 要件 2 - 投票参加機能

```
POST /api/polls/{pollId}/vote
Content-Type: application/json

Request Body:
{
  "optionId": "opt-1",
  "voterId": "user-789"
}

Response (200 OK):
{
  "success": true,
  "data": {
    "votedOptionId": "opt-1",
    "message": "投票が完了しました",
    "poll": {
      "id": "poll-123",
      "title": "今日のランチは？",
      "options": [
        { "id": "opt-1", "text": "寿司", "votes": 6, "percentage": 31.6 },
        { "id": "opt-2", "text": "ラーメン", "votes": 8, "percentage": 42.1 },
        { "id": "opt-3", "text": "パスタ", "votes": 5, "percentage": 26.3 }
      ],
      "totalVotes": 19
    }
  }
}

Error Response (409 Conflict):
{
  "success": false,
  "error": {
    "code": "ALREADY_VOTED",
    "message": "既に投票済みです"
  }
}
```

#### 投票結果取得

**要件対応**: 要件 3 - リアルタイム結果表示機能

```
GET /api/polls/{pollId}/results

Response (200 OK):
{
  "success": true,
  "data": {
    "pollId": "poll-123",
    "title": "今日のランチは？",
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
    "createdAt": "2025-01-26T10:00:00Z"
  }
}
```

### 投票管理API

**要件対応**: 要件 4 - 投票管理機能

#### 投票終了

```
POST /api/polls/{pollId}/end
Content-Type: application/json

Request Body:
{
  "createdBy": "user-456"
}

Response (200 OK):
{
  "success": true,
  "data": {
    "message": "投票が終了しました",
    "poll": {
      "id": "poll-123",
      "status": "ended",
      "finalResults": [
        {
          "optionId": "opt-1",
          "text": "寿司",
          "votes": 8,
          "percentage": 44.4
        }
      ],
      "totalVotes": 18
    }
  }
}
```

### エラーレスポンス

全てのAPIエンドポイントで統一されたエラーフォーマットを使用します。

```
HTTP 400 Bad Request
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "選択肢は最低2個必要です",
    "details": {
      "field": "options",
      "received": 1,
      "expected": "minimum 2"
    }
  }
}

HTTP 404 Not Found
{
  "success": false,
  "error": {
    "code": "POLL_NOT_FOUND",
    "message": "指定された投票が見つかりません"
  }
}

HTTP 409 Conflict
{
  "success": false,
  "error": {
    "code": "ALREADY_VOTED",
    "message": "既に投票済みです"
  }
}

HTTP 500 Internal Server Error
{
  "success": false,
  "error": {
    "code": "DATABASE_ERROR",
    "message": "データベース接続エラーが発生しました"
  }
}
```

## WebSocket API

**要件対応**: 要件 3 - リアルタイム結果表示機能

### 接続エンドポイント

```
ws://localhost:3000/ws/polls/{pollId}
```

### リアルタイム更新の仕組み

#### 投票実行フロー
1. クライアントA → REST API → 投票実行
2. サーバー → データベース (投票データ保存)
3. サーバー → WebSocket → 全クライアント (結果更新)

```javascript
// クライアント側の実装例
const ws = new WebSocket(`ws://localhost:3000/ws/polls/${pollId}`);

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'poll-updated') {
    // 結果画面を更新
    updatePollResults(message.payload);
  }
};
```

### メッセージフォーマット

WebSocketメッセージは「shared/src/types/index.ts」で定義されたWebSocketMessageインターフェースに従います。

```json
{
  "type": "join-poll" | "vote" | "poll-updated" | "vote-recorded" | "poll-ended",
  "payload": { /* タイプに応じたデータ */ }
}
```

### クライアント → サーバー

#### 投票結果購読開始
```json
{
  "type": "join-poll",
  "payload": {
    "pollId": "poll-123",
    "userId": "user-789"
  }
}
```

### サーバー → クライアント

#### 投票結果更新（リアルタイム）
```json
{
  "type": "poll-updated",
  "payload": {
    "poll": {
      "id": "poll-123",
      "title": "今日のランチは？",
      "options": [
        {
          "id": "opt-1",
          "text": "寿司",
          "votes": 8,
          "percentage": 44.4
        },
        {
          "id": "opt-2",
          "text": "ラーメン",
          "votes": 6,
          "percentage": 33.3
        },
        {
          "id": "opt-3",
          "text": "パスタ",
          "votes": 4,
          "percentage": 22.2
        }
      ],
      "status": "active",
      "totalVotes": 18
    }
  }
}
```

#### 投票完了通知
```json
{
  "type": "vote-recorded",
  "payload": {
    "votedOptionId": "opt-1",
    "message": "投票が完了しました"
  }
}
```

#### 投票終了通知
```json
{
  "type": "poll-ended",
  "payload": {
    "reason": "ADMIN_ENDED",
    "poll": {
      "id": "poll-123",
      "status": "ended",
      "finalResults": [
        {
          "id": "opt-1",
          "text": "寿司",
          "votes": 8,
          "percentage": 44.4
        }
      ],
      "totalVotes": 18
    }
  }
}
```

### 接続状態管理

#### 接続管理
- クライアントは投票ページや結果ページでWebSocket接続を開始
- サーバーは投票データの変更を検知し、接続中のクライアントにブロードキャスト
- クライアントは接続が切断された場合、自動で再接続を試みる

## データ永続化

**要件対応**: 要件 5 - データ永続化機能

### データベーススキーマ

#### Polls テーブル
```sql
CREATE TABLE polls (
  id VARCHAR(255) PRIMARY KEY,
  title TEXT NOT NULL,
  status ENUM('active', 'ended') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255) NOT NULL,
  total_votes INT DEFAULT 0,
  INDEX idx_created_at (created_at),
  INDEX idx_status (status)
);
```

#### Poll_Options テーブル
```sql
CREATE TABLE poll_options (
  id VARCHAR(255) PRIMARY KEY,
  poll_id VARCHAR(255) NOT NULL,
  text TEXT NOT NULL,
  votes INT DEFAULT 0,
  percentage DECIMAL(5,2) DEFAULT 0.00,
  FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE,
  INDEX idx_poll_id (poll_id)
);
```

#### Votes テーブル
```sql
CREATE TABLE votes (
  id VARCHAR(255) PRIMARY KEY,
  poll_id VARCHAR(255) NOT NULL,
  option_id VARCHAR(255) NOT NULL,
  voter_id VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE,
  FOREIGN KEY (option_id) REFERENCES poll_options(id) ON DELETE CASCADE,
  UNIQUE KEY unique_vote (poll_id, voter_id),
  INDEX idx_poll_id (poll_id),
  INDEX idx_voter_id (voter_id)
);
```

## データ型定義

全てのデータ型は「shared/src/types/index.ts」で定義されています。

### 主要なインターフェース

- `Poll`: 投票の基本情報
- `PollOption`: 投票の選択肢
- `Vote`: 投票記録
- `CreatePollRequest`: 投票作成リクエスト
- `VoteRequest`: 投票実行リクエスト
- `WebSocketMessage`: WebSocket通信メッセージ
- `ApiResponse`: APIレスポンス型

## セキュリティ考慮事項

### 入力バリデーション
- 投票タイトル: 最大200文字、HTMLタグ禁止
- 選択肢: 最大100文字、HTMLタグ禁止
- SQLインジェクション対策: プリペアードステートメント使用

### レート制限
- 投票作成: 1回/分/IP
- 投票実行: 1回/投票/ユーザー
- WebSocket接続: 10接続/IP

### CORS設定
```
Access-Control-Allow-Origin: https://yourdomain.com
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

## モバイル対応

**要件対応**: 要件 6 - レスポンシブデザイン

### レスポンシブブレークポイント
- モバイル: 768px 未満
- タブレット: 768px 以上 1024px 未満
- デスクトップ: 1024px 以上

### APIレスポンスの適応
- モバイルでのデータ使用量を配慮した軽量化
- 結果データの圧縮と最適化
- タッチインターフェースに対応したボタンサイズおよびタップターゲットサイズ