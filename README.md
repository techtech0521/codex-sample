# codex-sample

## MVP 技術方針

このプロジェクトでは、MVP（Minimum Viable Product）を素早く検証し、後から機能拡張しやすい構成を優先します。

### 1. アプリ形態

**Webアプリ** として開発します。

- ブラウザから利用でき、PC・スマートフォンの両方でアクセスしやすい
- ストア申請が不要で、MVPを素早く公開・改善できる
- 将来的にモバイルアプリ化する場合も、Web版で検証した仕様を流用しやすい

### 2. フロントエンド

**React / Next.js** を採用候補にします。

- 画面開発、ルーティング、API連携を一体で進めやすい
- MVPから本番運用まで拡張しやすい
- UIライブラリや周辺エコシステムが豊富

### 3. バックエンド

**Next.js API Routes** を採用候補にします。

- フロントエンドと同じリポジトリ内でAPIを管理できる
- 小規模なMVPでは構成をシンプルに保てる
- 必要に応じて、将来的にNode.js / ExpressやPython / FastAPIへ分離しやすい

### 4. データベース

**PostgreSQL** を採用候補にします。

- リレーショナルデータを扱いやすく、将来の機能追加に対応しやすい
- Supabaseや各種クラウドDBへ移行・接続しやすい
- MVP後にデータ量や機能が増えても運用しやすい

### 5. MVPでの認証方針

**最初は認証なし** で開始します。

- 初期開発では、主要機能の検証を優先する
- ログインやユーザー管理による実装コストを後回しにする
- 利用シーンや保存データの要件が固まった段階で、ログイン機能やユーザー別ログ管理を追加する

## 採用方針まとめ

| 項目 | 方針 |
| --- | --- |
| アプリ形態 | Webアプリ |
| フロントエンド | React / Next.js |
| バックエンド | Next.js API Routes |
| データベース | PostgreSQL |
| MVP認証 | 最初は認証なし |

## 学習ログデータモデル

MVPでは、1件の学習記録を `LearningLog` として扱います。最初は認証なしで開始する方針のため、`userId` は将来拡張項目として任意にします。

### 基本フィールド

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `id` | `string` / UUID | 必須 | 学習ログの一意なID |
| `date` | `date` | 必須 | 学習日。日付単位で検索・集計しやすい形式にする |
| `title` | `string` | 必須 | 学習内容のタイトル |
| `category` | `string` | 必須 | 学習カテゴリ。例: 英語、プログラミング、資格、読書 |
| `durationMinutes` | `number` / integer | 必須 | 学習時間。分単位で保存し、時間表示は画面側で変換する |
| `memo` | `string` / text | 任意 | 学習メモ。振り返りや補足内容を保存する |
| `createdAt` | `datetime` | 必須 | 作成日時 |
| `updatedAt` | `datetime` | 必須 | 更新日時 |

### 将来拡張フィールド

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `materialName` | `string` | 任意 | 教材名。書籍名、講座名、動画名など |
| `difficulty` | `string` / enum | 任意 | 難易度。例: easy、normal、hard |
| `mood` | `string` / enum | 任意 | 集中度や気分。例: focused、normal、tired |
| `tags` | `string[]` | 任意 | タグ。横断的な検索や分類に利用する |
| `userId` | `string` / UUID | 任意 | ユーザーID。認証機能を追加した後に利用する |

### TypeScript型定義案

```ts
export type LearningLogDifficulty = 'easy' | 'normal' | 'hard';

export type LearningLogMood = 'focused' | 'normal' | 'tired';

export type LearningLog = {
  id: string;
  date: string;
  title: string;
  category: string;
  durationMinutes: number;
  memo?: string;
  createdAt: string;
  updatedAt: string;
  materialName?: string;
  difficulty?: LearningLogDifficulty;
  mood?: LearningLogMood;
  tags?: string[];
  userId?: string;
};
```

### PostgreSQLテーブル設計案

```sql
CREATE TABLE learning_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes >= 0),
  memo TEXT,
  material_name VARCHAR(255),
  difficulty VARCHAR(50),
  mood VARCHAR(50),
  tags TEXT[] DEFAULT '{}',
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_learning_logs_date ON learning_logs (date);
CREATE INDEX idx_learning_logs_category ON learning_logs (category);
CREATE INDEX idx_learning_logs_tags ON learning_logs USING GIN (tags);
```

### 設計メモ

- `durationMinutes` は数値として保存し、合計学習時間やカテゴリ別集計をしやすくします。
- `date` は学習した日、`createdAt` / `updatedAt` はレコード管理用の日時として役割を分けます。
- MVPでは `category` を文字列で始め、カテゴリ管理が必要になった段階で別テーブル化を検討します。
- `tags` は複数条件で検索できるよう配列で持たせます。タグの表記ゆれが課題になった場合は別テーブル化します。
- 認証追加後は `userId` にインデックスを追加し、ユーザー別に学習ログを取得できるようにします。
