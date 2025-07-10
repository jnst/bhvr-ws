# リアルタイム投票システム設計書

## 1. システム概要

### 目的
リアルタイムで投票を実施し、結果を即座に参加者に共有するWebアプリケーションのMVPを構築する。

### 主要機能
- 投票の作成・管理
- リアルタイム投票参加
- 投票結果のリアルタイム表示
- 投票履歴の確認

### 技術要件
- **Frontend**: React 19 + Vite + TailwindCSS
- **Backend**: Hono + Bun runtime
- **リアルタイム通信**: WebSocket
- **Type Safety**: TypeScript monorepo構成

## 2. システム構成

### アーキテクチャ図
```
┌─────────────────┐    WebSocket    ┌─────────────────┐
│   React Client  │◄──────────────►│   Hono Server   │
│   (Vite + TS)   │                 │  (Bun runtime)  │
└─────────────────┘                 └─────────────────┘
         │                                   │
         │                                   │
         └─────────── Shared Types ──────────┘
```

### データフロー
1. **投票作成**: Client → Server → WebSocket Broadcast
2. **投票参加**: Client → Server → WebSocket Broadcast
3. **結果表示**: Server → WebSocket → All Clients

## 3. データモデル

### 投票 (Poll)
```typescript
interface Poll {
  id: string;
  title: string;
  description?: string;
  options: PollOption[];
  createdAt: Date;
  endsAt?: Date;
  isActive: boolean;
  totalVotes: number;
}
```

### 投票選択肢 (PollOption)
```typescript
interface PollOption {
  id: string;
  text: string;
  votes: number;
  percentage: number;
}
```

### 投票記録 (Vote)
```typescript
interface Vote {
  id: string;
  pollId: string;
  optionId: string;
  userId: string;
  timestamp: Date;
}
```

### ユーザー (User)
```typescript
interface User {
  id: string;
  sessionId: string;
  isConnected: boolean;
  lastSeen: Date;
}
```

## 4. WebSocket通信仕様

### イベント定義
```typescript
// サーバー → クライアント
interface ServerEvents {
  'poll:created': { poll: Poll };
  'poll:updated': { poll: Poll };
  'vote:cast': { pollId: string; optionId: string; newTotals: PollOption[] };
  'user:joined': { userId: string; totalUsers: number };
  'user:left': { userId: string; totalUsers: number };
}

// クライアント → サーバー
interface ClientEvents {
  'poll:create': { title: string; description?: string; options: string[] };
  'vote:cast': { pollId: string; optionId: string };
  'user:join': { sessionId: string };
}
```

### 接続管理
- WebSocket接続時にユニークなsessionIdを生成
- 接続切断時の自動クリーンアップ
- ハートビート機能による接続監視

## 5. API仕様

### REST API エンドポイント
```typescript
// 投票一覧取得
GET /api/polls
Response: { polls: Poll[] }

// 投票詳細取得
GET /api/polls/:id
Response: { poll: Poll }

// 投票作成
POST /api/polls
Body: { title: string; description?: string; options: string[] }
Response: { poll: Poll }

// 投票参加
POST /api/polls/:id/vote
Body: { optionId: string }
Response: { success: boolean; poll: Poll }
```

### WebSocket API
```typescript
// WebSocket接続
WS /ws
- 接続確立時: user:joined イベント送信
- 切断時: user:left イベント送信
```

## 6. UI/UX設計

### 画面構成
1. **メイン画面**: 投票一覧・作成フォーム
2. **投票詳細画面**: 投票参加・結果表示
3. **投票作成画面**: 新規投票作成フォーム

### コンポーネント設計
```typescript
// 主要コンポーネント
- PollList: 投票一覧表示
- PollCard: 投票カード
- PollForm: 投票作成フォーム
- VotingInterface: 投票参加UI
- ResultsDisplay: 結果表示（リアルタイム更新）
- ConnectionStatus: 接続状態表示
```

### UX考慮事項
- 投票結果のリアルタイム更新（アニメーション付き）
- 接続状態の可視化
- レスポンシブデザイン対応
- エラー状態の適切な表示

## 7. セキュリティ仕様

### 基本方針
- 重複投票の防止（sessionId ベース）
- WebSocket通信のバリデーション
- XSS対策（入力値のサニタイズ）
- CORS設定の適切な管理

### 実装事項
```typescript
// 投票バリデーション
interface VoteValidation {
  hasVoted: (sessionId: string, pollId: string) => boolean;
  isValidOption: (pollId: string, optionId: string) => boolean;
  isPollActive: (pollId: string) => boolean;
}
```

## 8. パフォーマンス要件

### 目標値
- WebSocket接続確立: < 1秒
- 投票反映: < 500ms
- 同時接続数: 100ユーザー（MVP）
- メモリ使用量: < 512MB

### 最適化戦略
- WebSocket接続の効率的管理
- 投票結果の差分更新
- 不要な再レンダリングの回避

## 9. 監視・ログ設計

### ログ出力項目
- WebSocket接続・切断
- 投票作成・参加
- エラー発生状況
- パフォーマンスメトリクス

### 監視対象
- WebSocket接続数
- 投票参加率
- レスポンス時間
- エラー発生率

## 10. 今後の拡張性

### Phase 2以降の機能
- ユーザー認証システム
- 投票結果の永続化（データベース）
- 投票結果の可視化（グラフ表示）
- 投票の期限設定
- 投票結果のエクスポート機能

### 技術的拡張
- Redis によるセッション管理
- PostgreSQL による永続化
- Docker コンテナ化
- CI/CD パイプライン構築