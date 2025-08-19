-- 攻略墙数据库架构
-- 请在 Neon 控制台执行此 SQL

-- 创建攻略墙数据表
CREATE TABLE IF NOT EXISTS strategies (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,           -- 攻略标题
  content TEXT NOT NULL,         -- 攻略内容
  author TEXT DEFAULT '匿名',    -- 作者昵称
  category TEXT DEFAULT 'PVE',   -- 攻略分类：PVP、PVE、新手向/老玩家回归、装备、战力系统等
  difficulty INTEGER DEFAULT 1,  -- 难度等级：1-5
  tags TEXT[] DEFAULT '{}',      -- 攻略标签数组
  likes JSONB DEFAULT '[]'::jsonb,     -- 点赞用户ID列表
  favorites JSONB DEFAULT '[]'::jsonb, -- 收藏用户ID列表
  comments JSONB DEFAULT '[]'::jsonb,  -- 评论列表
  is_pinned BOOLEAN DEFAULT FALSE,     -- 是否置顶
  image_url TEXT,                      -- 封面图片（向后兼容）
  media_files JSONB DEFAULT '[]'::jsonb, -- 多媒体文件列表
  view_count INTEGER DEFAULT 0,        -- 浏览次数
  status TEXT DEFAULT 'published',     -- 状态：published、draft、archived
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_strategies_created_at ON strategies(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_strategies_pinned ON strategies(is_pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_strategies_category ON strategies(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_strategies_difficulty ON strategies(difficulty, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_strategies_status ON strategies(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_strategies_likes ON strategies USING GIN(likes);

-- 创建触发器以自动更新updated_at字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_strategies_updated_at BEFORE UPDATE
ON strategies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入一些示例数据
INSERT INTO strategies (title, content, author, category, difficulty, tags, media_files) VALUES
(
  '新手入门：弹弹堂基础操作指南',
  E'## 欢迎来到弹弹堂！\n\n### 基础操作\n1. **移动**：使用方向键或WASD移动角色\n2. **瞄准**：鼠标控制发射角度\n3. **力度**：按住鼠标左键蓄力\n\n### 武器选择\n- **新手推荐**：小炮、导弹\n- **进阶武器**：激光炮、飞碟\n\n### 小贴士\n- 多练习不同角度的射击\n- 熟悉各种道具的使用\n- 观察风向对弹道的影响',
  '今夕_执手',
  '新手向/老玩家回归',
  1,
  '{"基础操作", "新手入门", "武器选择"}',
  '[
    {
      "id": "img_001",
      "type": "image",
      "url": "https://example.com/tutorial-basics.jpg",
      "thumbnail": "https://example.com/tutorial-basics-thumb.jpg",
      "title": "基础操作界面",
      "description": "游戏主界面说明"
    }
  ]'
),
(
  '高阶PVP技巧：预判与走位',
  E'## PVP进阶技巧\n\n### 预判技巧\n1. **观察对手习惯**：记住对手常用的移动路线\n2. **计算弹道时间**：提前瞄准对手可能到达的位置\n3. **心理博弈**：利用假动作迷惑对手\n\n### 走位要点\n- **不规律移动**：避免被对手预判\n- **利用地形**：善用掩体和高低差\n- **时机把握**：在对手射击后立即反击\n\n### 装备推荐\n- **武器**：散弹枪、狙击炮\n- **道具**：瞬移、护盾\n- **宠物**：加速型、防护型',
  '今夕_淡意',
  'PVP',
  4,
  '{"PVP", "预判", "走位", "高阶技巧"}',
  '[
    {
      "id": "vid_001",
      "type": "video",
      "url": "https://example.com/pvp-techniques.mp4",
      "thumbnail": "https://example.com/pvp-techniques-thumb.jpg",
      "title": "PVP走位技巧演示",
      "description": "实战演示高阶走位技巧",
      "duration": "05:32"
    },
    {
      "id": "img_002",
      "type": "image",
      "url": "https://example.com/pvp-equipment.jpg",
      "thumbnail": "https://example.com/pvp-equipment-thumb.jpg",
      "title": "推荐装备搭配",
      "description": "PVP最佳装备组合"
    }
  ]'
),
(
  'Boss攻略：火龙副本通关秘籍',
  E'## 火龙副本攻略\n\n### Boss特点\n- **血量**：80000\n- **特殊技能**：火焰喷射、飞行攻击\n- **弱点**：头部和尾部\n\n### 推荐配置\n**武器**：冰系武器效果最佳\n**宠物**：治疗型宠物必备\n**道具**：大血包、魔法盾\n\n### 打法流程\n1. **第一阶段**：集火头部，注意躲避火焰\n2. **第二阶段**：Boss飞行时攻击尾部\n3. **第三阶段**：疯狂模式，群体攻击\n\n### 注意事项\n- 保持队形，不要分散\n- 及时补血，注意血量\n- 合理使用道具时机',
  '今夕_星河',
  'PVE',
  3,
  '{"Boss攻略", "火龙", "副本", "团队作战"}',
  '[
    {
      "id": "vid_002",
      "type": "video",
      "url": "https://example.com/boss-fight-demo.mp4",
      "thumbnail": "https://example.com/boss-fight-thumb.jpg",
      "title": "火龙Boss击杀全程",
      "description": "完整的Boss战斗视频演示",
      "duration": "12:45"
    },
    {
      "id": "img_003",
      "type": "image",
      "url": "https://example.com/boss-positions.jpg",
      "thumbnail": "https://example.com/boss-positions-thumb.jpg",
      "title": "站位示意图",
      "description": "团队成员最佳站位图解"
    },
    {
      "id": "img_004",
      "type": "image",
      "url": "https://example.com/boss-rewards.jpg",
      "thumbnail": "https://example.com/boss-rewards-thumb.jpg",
      "title": "Boss掉落奖励",
      "description": "火龙Boss可能掉落的装备"
    }
  ]'
)
ON CONFLICT DO NOTHING;

-- 创建攻略分类枚举（可选，用于约束）
CREATE TYPE strategy_category AS ENUM ('PVP', 'PVE', '新手向/老玩家回归', '装备', '战力系统', '副本', '活动', '其他');
CREATE TYPE strategy_status AS ENUM ('published', 'draft', 'archived');

-- 如果需要严格的分类约束，可以修改表结构（可选）
-- ALTER TABLE strategies ALTER COLUMN category TYPE strategy_category USING category::strategy_category;
-- ALTER TABLE strategies ALTER COLUMN status TYPE strategy_status USING status::strategy_status;
