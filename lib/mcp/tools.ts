import { MetaApiError } from '../meta-ads';
import { logToolCall } from '../supabase';
import * as read from './handlers/read';
import * as sb from './handlers/status-budget';
import * as create from './handlers/creation';
import * as aud from './handlers/audiences';

type Handler = (args: Record<string, any>) => Promise<any>;

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

const str = (description: string) => ({ type: 'string', description });
const num = (description: string) => ({ type: 'number', description });
const obj = (description: string) => ({ type: 'object', description });
const arr = (description: string) => ({ type: 'array', description });

// ---------------------------------------------------------------------------
//  Tool definitions (22)
// ---------------------------------------------------------------------------
export const TOOL_DEFINITIONS: ToolDef[] = [
  // ---- Read (9) ----
  {
    name: 'list_ad_accounts',
    description: 'اعرض كل الـ ad accounts المتاحة للـ access token الحالي.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_account_details',
    description: 'تفاصيل ad account واحد (الاسم، العملة، الرصيد، حالة الحساب). بيقبل alias أو act_id.',
    inputSchema: {
      type: 'object',
      properties: { ad_account_id: str('alias أو act_<id> أو <id>'), fields: str('fields مخصصة (اختياري)') },
      required: ['ad_account_id'],
    },
  },
  {
    name: 'list_campaigns',
    description: 'اعرض الكامبينات في حساب معين.',
    inputSchema: {
      type: 'object',
      properties: {
        ad_account_id: str('alias أو act_<id>'),
        effective_status: arr('فلتر مثل ["ACTIVE","PAUSED"] (اختياري)'),
        limit: num('أقصى عدد (افتراضي 100)'),
      },
      required: ['ad_account_id'],
    },
  },
  {
    name: 'list_adsets',
    description: 'اعرض الـ ad sets — إما لكامبين (campaign_id) أو لحساب كامل (ad_account_id).',
    inputSchema: {
      type: 'object',
      properties: {
        campaign_id: str('فلتر بكامبين (اختياري)'),
        ad_account_id: str('alias أو act_<id> (لو مفيش campaign_id)'),
        limit: num('أقصى عدد'),
      },
    },
  },
  {
    name: 'list_ads',
    description: 'اعرض الإعلانات — لـ adset_id أو campaign_id أو ad_account_id.',
    inputSchema: {
      type: 'object',
      properties: {
        adset_id: str('فلتر بـ ad set (اختياري)'),
        campaign_id: str('فلتر بكامبين (اختياري)'),
        ad_account_id: str('alias أو act_<id> (لو مفيش غيره)'),
        limit: num('أقصى عدد'),
      },
    },
  },
  {
    name: 'get_ad_creative',
    description: 'هات الـ creative بتاع إعلان (ad_id) أو creative_id مباشرة.',
    inputSchema: {
      type: 'object',
      properties: { ad_id: str('id الإعلان'), creative_id: str('id الـ creative مباشرة') },
    },
  },
  {
    name: 'list_pages',
    description: 'اعرض الـ Facebook Pages المتاحة (والـ Instagram المرتبط بيها). الـ page tokens بتتشال من الناتج.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_instagram_accounts',
    description: 'اعرض حسابات Instagram Business المرتبطة — لصفحة (page_id) أو لكل الصفحات.',
    inputSchema: { type: 'object', properties: { page_id: str('id الصفحة (اختياري)') } },
  },
  {
    name: 'get_campaign_insights',
    description: 'إحصائيات الأداء (impressions, spend, ROAS...). بيشتغل على كامبين/أدسيت/إعلان/حساب.',
    inputSchema: {
      type: 'object',
      properties: {
        campaign_id: str('id الكامبين'),
        adset_id: str('id الأدسيت'),
        ad_id: str('id الإعلان'),
        ad_account_id: str('alias أو act_<id>'),
        level: str('campaign | adset | ad | account (افتراضي campaign)'),
        date_preset: str('مثل last_7d, last_30d, this_month'),
        time_range: obj('{since,until} بصيغة YYYY-MM-DD'),
        breakdowns: str('مثل age,gender,publisher_platform'),
        time_increment: num('تقسيم زمني (1 = يومي)'),
      },
    },
  },

  // ---- Status & Budget (4) ----
  {
    name: 'set_campaign_status',
    description: 'غيّر حالة كامبين (ACTIVE/PAUSED/ARCHIVED).',
    inputSchema: {
      type: 'object',
      properties: { campaign_id: str('id الكامبين'), status: str('ACTIVE | PAUSED | ARCHIVED') },
      required: ['campaign_id', 'status'],
    },
  },
  {
    name: 'set_adset_status',
    description: 'غيّر حالة ad set.',
    inputSchema: {
      type: 'object',
      properties: { adset_id: str('id الأدسيت'), status: str('ACTIVE | PAUSED | ARCHIVED') },
      required: ['adset_id', 'status'],
    },
  },
  {
    name: 'set_ad_status',
    description: 'غيّر حالة إعلان.',
    inputSchema: {
      type: 'object',
      properties: { ad_id: str('id الإعلان'), status: str('ACTIVE | PAUSED | ARCHIVED') },
      required: ['ad_id', 'status'],
    },
  },
  {
    name: 'update_budget',
    description: 'عدّل ميزانية كامبين (CBO) أو أدسيت. القيم بأصغر وحدة عملة (5000 = 50.00).',
    inputSchema: {
      type: 'object',
      properties: {
        campaign_id: str('id الكامبين (CBO)'),
        adset_id: str('id الأدسيت'),
        daily_budget: num('ميزانية يومية بأصغر وحدة'),
        lifetime_budget: num('ميزانية كلية بأصغر وحدة'),
        bid_amount: num('سقف العرض (اختياري)'),
      },
    },
  },

  // ---- Creation (5) — كله بيتعمل PAUSED ----
  {
    name: 'create_campaign',
    description: 'أنشئ كامبين جديد. ⚠️ بيتعمل PAUSED دايمًا.',
    inputSchema: {
      type: 'object',
      properties: {
        ad_account_id: str('alias أو act_<id>'),
        name: str('اسم الكامبين'),
        objective: str('مثل OUTCOME_SALES, OUTCOME_TRAFFIC, OUTCOME_LEADS'),
        special_ad_categories: arr('افتراضي [] — أو HOUSING/EMPLOYMENT/CREDIT/...'),
        daily_budget: num('CBO يومي بأصغر وحدة (اختياري)'),
        lifetime_budget: num('CBO كلي بأصغر وحدة (اختياري)'),
        bid_strategy: str('اختياري'),
        buying_type: str('AUCTION (افتراضي)'),
      },
      required: ['ad_account_id', 'name', 'objective'],
    },
  },
  {
    name: 'create_adset',
    description: 'أنشئ ad set جديد. ⚠️ بيتعمل PAUSED دايمًا. advantage_audience بيتحط افتراضيًا.',
    inputSchema: {
      type: 'object',
      properties: {
        ad_account_id: str('alias أو act_<id>'),
        campaign_id: str('id الكامبين الأب'),
        name: str('اسم الأدسيت'),
        optimization_goal: str('مثل OFFSITE_CONVERSIONS, LINK_CLICKS, REACH'),
        billing_event: str('مثل IMPRESSIONS, LINK_CLICKS'),
        daily_budget: num('بأصغر وحدة (لو مش CBO)'),
        lifetime_budget: num('بأصغر وحدة'),
        bid_amount: num('سقف العرض'),
        targeting: obj('targeting spec (geo, age, interests...)'),
        advantage_audience: num('0 أو 1 (افتراضي 0)'),
        promoted_object: obj('للـ conversion: {pixel_id, custom_event_type}'),
        start_time: str('ISO 8601 (اختياري)'),
        end_time: str('ISO 8601 (اختياري)'),
      },
      required: ['ad_account_id', 'campaign_id', 'name', 'optimization_goal', 'billing_event'],
    },
  },
  {
    name: 'create_ad_creative',
    description: 'أنشئ ad creative (إعلان مرئي) من object_story_spec أو object_story_id.',
    inputSchema: {
      type: 'object',
      properties: {
        ad_account_id: str('alias أو act_<id>'),
        name: str('اسم الـ creative'),
        object_story_spec: obj('{page_id, instagram_actor_id?, link_data|video_data}'),
        object_story_id: str('id بوست موجود (بديل)'),
        asset_feed_spec: obj('للـ dynamic/Advantage+ creative (بديل)'),
      },
      required: ['ad_account_id', 'name'],
    },
  },
  {
    name: 'create_ad',
    description: 'أنشئ إعلان يربط adset بـ creative. ⚠️ بيتعمل PAUSED دايمًا.',
    inputSchema: {
      type: 'object',
      properties: {
        ad_account_id: str('alias أو act_<id>'),
        name: str('اسم الإعلان'),
        adset_id: str('id الأدسيت'),
        creative_id: str('id الـ creative'),
      },
      required: ['ad_account_id', 'name', 'adset_id', 'creative_id'],
    },
  },
  {
    name: 'update_ad_creative',
    description: 'عدّل creative موجود (الاسم/الحالة — الـ creatives شبه immutable).',
    inputSchema: {
      type: 'object',
      properties: {
        creative_id: str('id الـ creative'),
        name: str('اسم جديد'),
        status: str('ACTIVE | DELETED'),
      },
      required: ['creative_id'],
    },
  },

  // ---- Audiences (4) ----
  {
    name: 'list_audiences',
    description: 'اعرض الـ custom/lookalike audiences في حساب.',
    inputSchema: {
      type: 'object',
      properties: { ad_account_id: str('alias أو act_<id>'), limit: num('أقصى عدد') },
      required: ['ad_account_id'],
    },
  },
  {
    name: 'create_custom_audience',
    description: 'أنشئ custom audience (file-based أو website/engagement rule).',
    inputSchema: {
      type: 'object',
      properties: {
        ad_account_id: str('alias أو act_<id>'),
        name: str('اسم الجمهور'),
        subtype: str('CUSTOM (افتراضي) | WEBSITE | ENGAGEMENT'),
        description: str('وصف (اختياري)'),
        rule: obj('قاعدة للـ website/engagement audiences'),
        customer_file_source: str('USER_PROVIDED_ONLY (افتراضي)'),
      },
      required: ['ad_account_id', 'name'],
    },
  },
  {
    name: 'add_users_to_audience',
    description: 'ضيف مستخدمين لـ custom audience. الإيميلات/الموبايلات بيتعملها SHA-256 على السيرفر قبل ما تتبعت.',
    inputSchema: {
      type: 'object',
      properties: {
        audience_id: str('id الجمهور'),
        users: arr('list من {email?, phone?} — raw، الهاش بيتعمل تلقائي'),
        session: obj('session للـ batching (اختياري)'),
      },
      required: ['audience_id', 'users'],
    },
  },
  {
    name: 'create_lookalike_audience',
    description: 'أنشئ lookalike من جمهور مصدر.',
    inputSchema: {
      type: 'object',
      properties: {
        ad_account_id: str('alias أو act_<id>'),
        name: str('اسم الـ lookalike'),
        origin_audience_id: str('id الجمهور المصدر'),
        country: str('كود الدولة مثل EG'),
        ratio: num('0.01 - 0.20 (نسبة التشابه)'),
        type: str('similarity (افتراضي) | reach'),
      },
      required: ['ad_account_id', 'name', 'origin_audience_id'],
    },
  },
];

// ---------------------------------------------------------------------------
//  Handlers map (name -> function)
// ---------------------------------------------------------------------------
const HANDLERS: Record<string, Handler> = {
  list_ad_accounts: read.list_ad_accounts,
  get_account_details: read.get_account_details,
  list_campaigns: read.list_campaigns,
  list_adsets: read.list_adsets,
  list_ads: read.list_ads,
  get_ad_creative: read.get_ad_creative,
  list_pages: read.list_pages,
  list_instagram_accounts: read.list_instagram_accounts,
  get_campaign_insights: read.get_campaign_insights,

  set_campaign_status: sb.set_campaign_status,
  set_adset_status: sb.set_adset_status,
  set_ad_status: sb.set_ad_status,
  update_budget: sb.update_budget,

  create_campaign: create.create_campaign,
  create_adset: create.create_adset,
  create_ad_creative: create.create_ad_creative,
  create_ad: create.create_ad,
  update_ad_creative: create.update_ad_creative,

  list_audiences: aud.list_audiences,
  create_custom_audience: aud.create_custom_audience,
  add_users_to_audience: aud.add_users_to_audience,
  create_lookalike_audience: aud.create_lookalike_audience,
};

function extractAccount(args: Record<string, any>): string | null {
  return args?.ad_account_id ?? null;
}

/** Truncate large results before persisting to the audit log. */
function safeResult(value: unknown): unknown {
  try {
    const s = JSON.stringify(value);
    if (s.length > 60000) return { _truncated: true, length: s.length };
    return value;
  } catch {
    return null;
  }
}

/**
 * SAFETY PATTERN #3: every tool call is wrapped, timed, and written to
 * meta_tool_calls (with duration_ms) whether it succeeds or fails.
 */
export async function callTool(name: string, args: Record<string, any> = {}): Promise<any> {
  const handler = HANDLERS[name];
  if (!handler) {
    throw new MetaApiError(`أداة غير معروفة: ${name}`, { status: 404 });
  }
  const start = Date.now();
  let result: any;
  let error: string | null = null;
  try {
    result = await handler(args);
    return result;
  } catch (e: any) {
    error = e instanceof MetaApiError ? e.toUserMessage() : e?.message || String(e);
    throw e;
  } finally {
    void logToolCall({
      tool_name: name,
      arguments: args,
      result: error ? null : safeResult(result),
      error,
      duration_ms: Date.now() - start,
      ad_account_id: extractAccount(args),
    });
  }
}
