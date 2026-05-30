import { metaGet, metaPost, MetaApiError } from '../../meta-ads';
import { resolveAlias } from '../../supabase';

type Args = Record<string, any>;

/**
 * SAFETY PATTERN #1 (إلزامي):
 * أي entity جديد بيتعمل بـ status = PAUSED بغض النظر عن المُدخل.
 * مفيش طريقة من خلال الـ MCP إن حاجة تتولد ACTIVE.
 */
const FORCED_STATUS = 'PAUSED';

// 14
export async function create_campaign(args: Args) {
  const account = await resolveAlias(args.ad_account_id);
  if (!args.name) throw new MetaApiError('name مطلوب', { status: 400 });
  if (!args.objective) throw new MetaApiError('objective مطلوب (مثال: OUTCOME_SALES)', { status: 400 });

  const body: Args = {
    name: args.name,
    objective: args.objective,
    status: FORCED_STATUS, // forced
    // special_ad_categories إلزامي في الـ API (لو مفيش، ابعت [])
    special_ad_categories: args.special_ad_categories ?? [],
  };
  if (args.buying_type) body.buying_type = args.buying_type;
  if (args.daily_budget !== undefined) body.daily_budget = Math.round(Number(args.daily_budget));
  if (args.lifetime_budget !== undefined)
    body.lifetime_budget = Math.round(Number(args.lifetime_budget));
  if (args.bid_strategy) body.bid_strategy = args.bid_strategy;
  // ملاحظة: Meta v23 شالت campaign.start_date و campaign.end_date — الجدولة بقت
  // على مستوى الـ ad set (start_time / end_time) بس.

  const created = await metaPost(`${account}/campaigns`, body);
  const details = await metaGet(created.id, {
    fields: 'id,name,status,objective,special_ad_categories',
  });
  return { created_paused: true, ...details };
}

// 15
export async function create_adset(args: Args) {
  const account = await resolveAlias(args.ad_account_id);
  if (!args.name) throw new MetaApiError('name مطلوب', { status: 400 });
  if (!args.campaign_id) throw new MetaApiError('campaign_id مطلوب', { status: 400 });
  if (!args.optimization_goal)
    throw new MetaApiError('optimization_goal مطلوب (مثال: OFFSITE_CONVERSIONS)', { status: 400 });
  if (!args.billing_event)
    throw new MetaApiError('billing_event مطلوب (مثال: IMPRESSIONS)', { status: 400 });

  // advantage_audience أصبح إلزامي 2025 على كل أد سيت جديد.
  const targeting: Args = { ...(args.targeting || {}) };
  if (targeting.advantage_audience === undefined) {
    targeting.advantage_audience = args.advantage_audience ?? 0;
  }

  const body: Args = {
    name: args.name,
    campaign_id: args.campaign_id,
    optimization_goal: args.optimization_goal,
    billing_event: args.billing_event,
    status: FORCED_STATUS, // forced
    targeting,
  };
  if (args.daily_budget !== undefined) body.daily_budget = Math.round(Number(args.daily_budget));
  if (args.lifetime_budget !== undefined)
    body.lifetime_budget = Math.round(Number(args.lifetime_budget));
  if (args.bid_amount !== undefined) body.bid_amount = Math.round(Number(args.bid_amount));
  if (args.bid_strategy) body.bid_strategy = args.bid_strategy;
  if (args.start_time) body.start_time = args.start_time;
  if (args.end_time) body.end_time = args.end_time;
  if (args.promoted_object) body.promoted_object = args.promoted_object;
  if (args.destination_type) body.destination_type = args.destination_type;

  const created = await metaPost(`${account}/adsets`, body);
  const details = await metaGet(created.id, {
    fields: 'id,name,status,campaign_id,optimization_goal,billing_event,daily_budget,targeting',
  });
  return { created_paused: true, ...details };
}

// 16
export async function create_ad_creative(args: Args) {
  const account = await resolveAlias(args.ad_account_id);
  if (!args.name) throw new MetaApiError('name مطلوب', { status: 400 });

  const body: Args = { name: args.name };
  // أكثر طريقة شائعة: object_story_spec (link ad / image / video)
  if (args.object_story_spec) body.object_story_spec = args.object_story_spec;
  if (args.degrees_of_freedom_spec) body.degrees_of_freedom_spec = args.degrees_of_freedom_spec;
  if (args.asset_feed_spec) body.asset_feed_spec = args.asset_feed_spec;
  if (args.object_story_id) body.object_story_id = args.object_story_id;

  if (!body.object_story_spec && !body.object_story_id && !body.asset_feed_spec) {
    throw new MetaApiError(
      'لازم تبعت object_story_spec أو object_story_id أو asset_feed_spec',
      { status: 400 }
    );
  }

  const created = await metaPost(`${account}/adcreatives`, body);
  return metaGet(created.id, {
    fields: 'id,name,object_story_spec,thumbnail_url,image_url',
  });
}

// 17
export async function create_ad(args: Args) {
  const account = await resolveAlias(args.ad_account_id);
  if (!args.name) throw new MetaApiError('name مطلوب', { status: 400 });
  if (!args.adset_id) throw new MetaApiError('adset_id مطلوب', { status: 400 });
  if (!args.creative_id && !args.creative)
    throw new MetaApiError('creative_id مطلوب', { status: 400 });

  const body: Args = {
    name: args.name,
    adset_id: args.adset_id,
    status: FORCED_STATUS, // forced
    creative: args.creative || { creative_id: args.creative_id },
  };

  const created = await metaPost(`${account}/ads`, body);
  const details = await metaGet(created.id, {
    fields: 'id,name,status,adset_id,creative',
  });
  return { created_paused: true, ...details };
}

// 18
export async function update_ad_creative(args: Args) {
  if (!args.creative_id) throw new MetaApiError('creative_id مطلوب', { status: 400 });
  const body: Args = {};
  // الـ creatives في Meta شبه immutable — اللي ينفع يتعدّل غالبًا الاسم والحالة.
  if (args.name !== undefined) body.name = args.name;
  if (args.status !== undefined) body.status = args.status; // ACTIVE | DELETED
  if (args.account_id !== undefined) body.account_id = args.account_id;
  if (Object.keys(body).length === 0) {
    throw new MetaApiError('مفيش حاجة تتعدّل — ابعت name أو status', { status: 400 });
  }
  await metaPost(args.creative_id, body);
  return metaGet(args.creative_id, { fields: 'id,name,status' });
}
