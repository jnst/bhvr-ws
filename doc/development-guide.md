# 開発ガイド

## 1. TDD開発プロセス

### Architectural Reasoning + TDD
このプロジェクトでは以下の5ステップサイクルを採用します：

1. **Plan & Decompose**: 機能の振る舞いを検証可能な最小単位に分解して`testlist.md`に記述
2. **Red**: 最小テストケースを記述（コンパイル成功・テスト失敗）
3. **Green**: LintとTestが成功する実装
4. **Commit**: `testlist.md`にチェックを付けてgitに記録
5. **Iterate**: `testlist.md`が全てチェック済みになるまで2-5を反復

### testlist.md フォーマット
```markdown
# Test List

## 投票システム機能

### 基本機能
- [ ] 投票作成機能
  - [ ] タイトル入力バリデーション
  - [ ] 選択肢追加（最低2つ）
  - [ ] 投票作成API呼び出し
  - [ ] 成功時の投票一覧更新

- [ ] 投票参加機能
  - [ ] 選択肢選択
  - [ ] 重複投票防止
  - [ ] 投票送信API呼び出し
  - [ ] 結果リアルタイム更新

### WebSocket通信
- [ ] 接続管理
  - [ ] 接続確立時の初期化
  - [ ] 切断時のクリーンアップ
  - [ ] 再接続処理

- [ ] イベント処理
  - [ ] 投票作成イベント受信
  - [ ] 投票更新イベント受信
  - [ ] ユーザー参加・退出イベント処理
```

## 2. コーディング規約

### TypeScript設定
```typescript
// tsconfig.json strict設定
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### 命名規約
```typescript
// インターfaces: PascalCase
interface PollData {
  id: string;
  title: string;
}

// 関数・変数: camelCase
const createPoll = (data: PollData) => { ... };
const pollId = generateId();

// 定数: UPPER_SNAKE_CASE
const MAX_POLL_OPTIONS = 10;
const API_BASE_URL = 'http://localhost:3000';

// コンポーネント: PascalCase
const PollList = () => { ... };
const VotingInterface = () => { ... };
```

### ファイル構成
```
src/
├── components/          # Reactコンポーネント
│   ├── ui/             # 再利用可能なUIコンポーネント
│   ├── polls/          # 投票関連コンポーネント
│   └── layout/         # レイアウトコンポーネント
├── hooks/              # カスタムフック
├── lib/                # ユーティリティ関数
├── services/           # API・WebSocket通信
├── stores/             # 状態管理
├── types/              # 型定義
└── utils/              # 汎用ユーティリティ
```

### コンポーネント設計原則
```typescript
// 1. 単一責任の原則
const PollCard = ({ poll }: { poll: Poll }) => {
  // 投票カード表示のみに集中
  return (
    <div className="poll-card">
      <h3>{poll.title}</h3>
      <p>{poll.description}</p>
    </div>
  );
};

// 2. Props型定義
interface PollFormProps {
  onSubmit: (data: PollFormData) => void;
  isLoading?: boolean;
  initialData?: Partial<PollFormData>;
}

// 3. デフォルト値設定
const PollForm = ({ 
  onSubmit, 
  isLoading = false, 
  initialData = {} 
}: PollFormProps) => {
  // コンポーネント実装
};
```

## 3. テスト戦略

### テストピラミッド
```
       /\
      /  \     E2E Tests (少数)
     /____\    統合テスト (適度)
    /      \   単体テスト (多数)
   /________\
```

### 単体テスト
```typescript
// 関数テスト例
describe('createPoll', () => {
  it('should create a poll with valid data', () => {
    const data = {
      title: 'Test Poll',
      options: ['Option 1', 'Option 2']
    };
    
    const result = createPoll(data);
    
    expect(result.title).toBe('Test Poll');
    expect(result.options).toHaveLength(2);
    expect(result.id).toBeDefined();
  });
  
  it('should throw error for invalid data', () => {
    const data = {
      title: '',
      options: ['Option 1']
    };
    
    expect(() => createPoll(data)).toThrow('Invalid poll data');
  });
});
```

### コンポーネントテスト
```typescript
// React Testing Library
import { render, screen, fireEvent } from '@testing-library/react';
import { PollForm } from './PollForm';

describe('PollForm', () => {
  it('should submit form with valid data', async () => {
    const mockOnSubmit = jest.fn();
    
    render(<PollForm onSubmit={mockOnSubmit} />);
    
    // フォーム入力
    fireEvent.change(screen.getByLabelText('Poll Title'), {
      target: { value: 'Test Poll' }
    });
    
    fireEvent.click(screen.getByRole('button', { name: 'Create Poll' }));
    
    // 送信確認
    expect(mockOnSubmit).toHaveBeenCalledWith({
      title: 'Test Poll',
      options: expect.any(Array)
    });
  });
});
```

### WebSocket テスト
```typescript
// WebSocket通信テスト
describe('WebSocket Connection', () => {
  let mockWebSocket: jest.Mocked<WebSocket>;
  
  beforeEach(() => {
    mockWebSocket = {
      send: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      readyState: WebSocket.OPEN
    } as any;
  });
  
  it('should handle poll creation event', () => {
    const handler = new WebSocketHandler(mockWebSocket);
    const mockPoll = { id: '1', title: 'Test Poll' };
    
    handler.handleMessage({
      type: 'poll:created',
      data: mockPoll
    });
    
    expect(handler.getCurrentPolls()).toContain(mockPoll);
  });
});
```

## 4. 状態管理戦略

### React状態管理
```typescript
// カスタムフック例
const usePoll = (pollId: string) => {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchPoll = async () => {
      try {
        setIsLoading(true);
        const response = await api.getPoll(pollId);
        setPoll(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPoll();
  }, [pollId]);
  
  return { poll, isLoading, error };
};
```

### WebSocket状態管理
```typescript
// WebSocket フック
const useWebSocket = (url: string) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    const ws = new WebSocket(url);
    
    ws.onopen = () => {
      setIsConnected(true);
      setSocket(ws);
    };
    
    ws.onclose = () => {
      setIsConnected(false);
      setSocket(null);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    return () => {
      ws.close();
    };
  }, [url]);
  
  const sendMessage = useCallback((message: any) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify(message));
    }
  }, [socket, isConnected]);
  
  return { socket, isConnected, sendMessage };
};
```

## 5. エラーハンドリング

### エラーバウンダリー実装
```typescript
// 投票システム専用エラーバウンダリー
const VotingErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      setHasError(true);
      setError(new Error(error.message));
    };
    
    window.addEventListener('error', handleError);
    
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);
  
  if (hasError) {
    return <ErrorFallback error={error} />;
  }
  
  return <>{children}</>;
};
```

### API エラーハンドリング
```typescript
// API通信エラーハンドリング
const handleApiError = (error: unknown): string => {
  if (error instanceof Response) {
    switch (error.status) {
      case 400:
        return 'Invalid request data';
      case 404:
        return 'Poll not found';
      case 429:
        return 'Too many requests. Please try again later.';
      case 500:
        return 'Server error. Please try again.';
      default:
        return 'An unexpected error occurred';
    }
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'Unknown error occurred';
};
```

## 6. デバッグとパフォーマンス

### デバッグツール
```typescript
// 開発環境用ログ
const logger = {
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${message}`, data);
    }
  },
  
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${message}`, data);
  },
  
  error: (message: string, error?: Error) => {
    console.error(`[ERROR] ${message}`, error);
  }
};
```

### パフォーマンス監視
```typescript
// パフォーマンス測定
const measurePerformance = (name: string, fn: () => void) => {
  const start = performance.now();
  fn();
  const end = performance.now();
  console.log(`${name}: ${end - start}ms`);
};

// React DevTools Profiler
const ProfiledComponent = ({ children }: { children: React.ReactNode }) => {
  return (
    <Profiler
      id="voting-system"
      onRender={(id, phase, actualDuration) => {
        console.log(`${id} ${phase}: ${actualDuration}ms`);
      }}
    >
      {children}
    </Profiler>
  );
};
```

## 7. Git ワークフロー

### ブランチ戦略
```bash
# メインブランチ
main                 # 本番環境
develop             # 開発環境

# 機能ブランチ
feature/poll-creation     # 投票作成機能
feature/websocket-setup   # WebSocket実装
feature/ui-components     # UIコンポーネント

# バグ修正ブランチ
fix/vote-validation      # 投票バリデーション修正
fix/websocket-reconnect  # WebSocket再接続修正
```

### コミットメッセージ
```bash
# Angular Conventional Commits形式
feat(poll): add poll creation functionality
fix(websocket): resolve connection timeout issue
docs(readme): update installation instructions
test(voting): add unit tests for vote validation
refactor(api): extract common error handling
```

## 8. 開発環境セットアップ

### 必要なツール
```bash
# Node.js & Bun
curl -fsSL https://bun.sh/install | bash

# VS Code Extensions
- TypeScript and JavaScript Language Features
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- Jest Runner
```

### 開発サーバー起動
```bash
# 初期セットアップ
bun install

# 開発サーバー起動（全体）
bun run dev

# 個別起動
bun run dev:shared    # 共有型定義 (watch mode)
bun run dev:server    # Hono サーバー
bun run dev:client    # React クライアント
```

### 品質チェック
```bash
# 型チェック
bun run typecheck

# Lint
bun run lint

# テスト
bun run test

# ビルド
bun run build
```

## 9. トラブルシューティング

### よくある問題と解決策

#### 1. 共有型が見つからない
```bash
# 解決方法
cd shared && bun run build
```

#### 2. WebSocket接続エラー
```typescript
// デバッグ方法
const ws = new WebSocket('ws://localhost:3001');
ws.onopen = () => console.log('Connected');
ws.onerror = (error) => console.error('WebSocket error:', error);
ws.onclose = (event) => console.log('Disconnected:', event.code, event.reason);
```

#### 3. 型エラー
```bash
# 型定義の再生成
bun run build:shared
# IDEの再起動
```

#### 4. パフォーマンス問題
```typescript
// React DevTools Profilerで分析
// 不要な再レンダリングの確認
// useMemo / useCallback の使用検討
```

## 10. 本番環境への準備

### 環境変数設定
```bash
# .env.production
NODE_ENV=production
VITE_SERVER_URL=https://api.yourdomain.com
WEBSOCKET_URL=wss://ws.yourdomain.com
```

### ビルド最適化
```bash
# 本番ビルド
bun run build

# サイズ分析
bun run build:analyze
```

### セキュリティチェック
```bash
# 依存関係の脆弱性チェック
bun audit

# 型チェック
bun run typecheck

# テスト実行
bun run test
```