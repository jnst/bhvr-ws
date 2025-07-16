# Redis データ構造設計

## キー設計原則

### 命名規則
- **階層構造**: コロン（:）で区切る
- **プレフィックス**: 機能別のプレフィックス
- **一意性**: 重複しないキー設計
- **可読性**: 理解しやすい名前

### キー例
```
poll:123                    # 投票基本情報
poll:123:votes             # 投票結果
poll:123:participants      # 参加者リスト
poll:123:updates           # Pub/Sub チャンネル
poll:123:system            # システムイベント
```

## データ型とスキーマ

### 1. 投票基本情報（String）
**キー**: `poll:{pollId}`
**データ型**: String（JSON）
**TTL**: 投票期間（秒）

```json
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
```

**Redis コマンド例**:
```bash
# 投票作成
SET poll:123 '{"id":"poll-123","question":"今日のランチは？",...}'
EXPIRE poll:123 300

# 投票取得
GET poll:123
TTL poll:123
```

### 2. 投票結果（Hash）
**キー**: `poll:{pollId}:votes`
**データ型**: Hash
**TTL**: 投票基本情報と同じ

```bash
# Hash 構造
opt-1 → 8    # 寿司: 8票
opt-2 → 6    # ラーメン: 6票
opt-3 → 4    # パスタ: 4票
```

**Redis コマンド例**:
```bash
# 投票実行
HINCRBY poll:123:votes opt-1 1

# 結果取得
HGETALL poll:123:votes
HGET poll:123:votes opt-1

# 総投票数
HVALS poll:123:votes  # [8, 6, 4] → 合計18票
```

### 3. 参加者リスト（Set）
**キー**: `poll:{pollId}:participants`
**データ型**: Set
**TTL**: 投票基本情報と同じ

```bash
# Set 構造
{
  "user-456",
  "user-789",
  "user-101",
  ...
}
```

**Redis コマンド例**:
```bash
# 参加者追加
SADD poll:123:participants user-456

# 重複チェック
SISMEMBER poll:123:participants user-456

# 参加者数取得
SCARD poll:123:participants

# 全参加者取得
SMEMBERS poll:123:participants
```

### 4. Pub/Sub チャンネル
**チャンネル名**: `poll:{pollId}:updates`
**データ型**: Pub/Sub メッセージ（JSON）

```json
{
  "type": "VOTE_CAST",
  "pollId": "poll-123",
  "optionId": "opt-1",
  "timestamp": "2025-01-15T10:00:00Z"
}
```

**Redis コマンド例**:
```bash
# メッセージ発行
PUBLISH poll:123:updates '{"type":"VOTE_CAST","optionId":"opt-1"}'

# チャンネル購読
SUBSCRIBE poll:123:updates

# 複数チャンネル購読
SUBSCRIBE poll:123:updates poll:123:system
```

### 5. システムイベント（Pub/Sub）
**チャンネル名**: `poll:{pollId}:system`
**データ型**: Pub/Sub メッセージ（JSON）

```json
{
  "type": "POLL_ENDED",
  "pollId": "poll-123",
  "reason": "TIME_EXPIRED",
  "timestamp": "2025-01-15T10:05:00Z"
}
```

## データ操作パターン

### 1. 投票作成
```bash
# 1. 投票基本情報保存
SET poll:123 '{"id":"poll-123","question":"今日のランチは？",...}'
EXPIRE poll:123 300

# 2. 投票結果初期化
HSET poll:123:votes opt-1 0
HSET poll:123:votes opt-2 0
HSET poll:123:votes opt-3 0
EXPIRE poll:123:votes 300

# 3. 参加者リスト初期化
# Set は自動で空から開始
EXPIRE poll:123:participants 300
```

### 2. 投票実行
```bash
# 1. 重複チェック
SISMEMBER poll:123:participants user-456

# 2. 投票カウント（アトミック）
HINCRBY poll:123:votes opt-1 1

# 3. 参加者追加
SADD poll:123:participants user-456

# 4. イベント発行
PUBLISH poll:123:updates '{"type":"VOTE_CAST","optionId":"opt-1"}'
```

### 3. 結果取得
```bash
# 1. 投票基本情報
GET poll:123

# 2. 投票結果
HGETALL poll:123:votes

# 3. 参加者数
SCARD poll:123:participants

# 4. 残り時間
TTL poll:123
```

### 4. 投票終了
```bash
# 1. システムイベント発行
PUBLISH poll:123:system '{"type":"POLL_ENDED","reason":"TIME_EXPIRED"}'

# 2. 自動期限切れ（TTL により自動削除）
# データは TTL により自動的に削除される
```

## データ整合性

### 1. アトミック操作
- **HINCRBY**: 投票カウントの原子性
- **SADD**: 参加者追加の原子性
- **SISMEMBER**: 重複チェックの原子性

### 2. トランザクション
```bash
# MULTI/EXEC によるトランザクション
MULTI
SISMEMBER poll:123:participants user-456
HINCRBY poll:123:votes opt-1 1
SADD poll:123:participants user-456
EXEC
```

### 3. 楽観的ロック
```bash
# WATCH による楽観的ロック
WATCH poll:123:participants
MULTI
SISMEMBER poll:123:participants user-456
HINCRBY poll:123:votes opt-1 1
SADD poll:123:participants user-456
EXEC
```

## メモリ最適化

### 1. データ圧縮
- **JSON 最小化**: 不要な空白削除
- **フィールド名短縮**: 長いフィールド名の短縮
- **数値型**: 文字列ではなく数値として保存

### 2. TTL 管理
```bash
# 自動期限切れ設定
EXPIRE poll:123 300
EXPIRE poll:123:votes 300
EXPIRE poll:123:participants 300

# 期限延長
EXPIRE poll:123 600  # 10分に延長
```

### 3. メモリ使用量監視
```bash
# キーのメモリ使用量
MEMORY USAGE poll:123
MEMORY USAGE poll:123:votes
MEMORY USAGE poll:123:participants

# データベース全体の使用量
INFO memory
```

## インデックス戦略

### 1. 投票検索
- **時間ベース**: 作成時間での検索
- **ステータスベース**: アクティブ/終了での検索
- **ユーザーベース**: 作成者での検索

### 2. セカンダリインデックス
```bash
# 時間ベースインデックス
ZADD polls:by_created_at 1642248000 poll:123
ZADD polls:by_created_at 1642248300 poll:124

# ステータスベースインデックス
SADD polls:active poll:123
SADD polls:ended poll:124

# ユーザーベースインデックス
SADD user:456:polls poll:123
```

## バックアップ戦略

### 1. RDB スナップショット
```bash
# 手動スナップショット
BGSAVE

# 自動スナップショット設定
save 900 1    # 900秒で1回以上の変更
save 300 10   # 300秒で10回以上の変更
save 60 10000 # 60秒で10000回以上の変更
```

### 2. AOF ログ
```bash
# AOF 有効化
appendonly yes
appendfilename "appendonly.aof"

# 同期モード
appendfsync everysec  # 毎秒同期
```

### 3. データ復旧
```bash
# RDB から復旧
redis-server --dbfilename dump.rdb

# AOF から復旧
redis-server --appendonly yes --appendfilename appendonly.aof
```

## パフォーマンス最適化

### 1. パイプライン
```javascript
// Node.js での パイプライン例
const pipeline = redis.pipeline();
pipeline.get('poll:123');
pipeline.hgetall('poll:123:votes');
pipeline.scard('poll:123:participants');
pipeline.ttl('poll:123');
const results = await pipeline.exec();
```

### 2. バッチ処理
```bash
# 複数投票の結果を一括取得
MGET poll:123 poll:124 poll:125

# 複数 Hash の取得
EVAL "
  local results = {}
  for i, key in ipairs(KEYS) do
    results[i] = redis.call('HGETALL', key)
  end
  return results
" 3 poll:123:votes poll:124:votes poll:125:votes
```

### 3. 読み取り専用レプリカ
```bash
# 読み取り専用操作をレプリカで実行
# マスター: 書き込み操作
HINCRBY poll:123:votes opt-1 1
SADD poll:123:participants user-456

# レプリカ: 読み取り操作
GET poll:123
HGETALL poll:123:votes
SCARD poll:123:participants
```

## 監視とデバッグ

### 1. キー監視
```bash
# キー一覧
KEYS poll:*

# キー数
DBSIZE

# キー情報
TYPE poll:123
TTL poll:123
```

### 2. メモリ監視
```bash
# メモリ使用量
INFO memory

# キー別メモリ使用量
MEMORY USAGE poll:123
```

### 3. パフォーマンス監視
```bash
# 遅いクエリ
SLOWLOG GET 10

# 統計情報
INFO stats
```