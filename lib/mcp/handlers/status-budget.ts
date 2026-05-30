import { metaGet, metaPost, MetaApiError } from '../../meta-ads';

type Args = Record<string, any>;

const VALID_STATUSES = ['ACTIVE', 'PAUSED', 'ARCHIVED', 'DELETED'];

function assertStatus(status: string) {
  if (!VALID_STATUSES.includes(status)) {
    throw new MetaApiError(`status لازم يكون واحد من: ${VALID_STATUSES.join(', ')}`, {
      status: 400,
    });
  }
}

// 10
export async function set_campaign_status(args: Args) {
  assertStatus(args.status);
  await metaPost(args.campaign_id, { status: args.status });
  return metaGet(args.campaign_id, { fields: 'id,name,status,effective_status' });
}

// 11
export async function set_adset_status(args: Args) {
  assertStatus(args.status);
  await metaPost(args.adset_id, { status: args.status });
  return metaGet(args.adset_id, { fields: 'id,name,status,effective_status' });
}

// 12
export async function set_ad_status(args: Args) {
  assertStatus(args.status);
  await metaPost(args.ad_id, { status: args.status });
  return metaGet(args.ad_id, { fields: 'id,name,status,effective_status' });
}

/**
 * 13 — update_budget
 * Works on a campaign (CBO) or an ad set. Budgets are in the account's
 * minor currency unit (e.g. cents / قروش): 50.00 EGP => 5000.
 */
export async function update_budget(args: Args) {
  const id = args.campaign_id || args.adset_id;
  if (!id) {
    throw new MetaApiError('لازم تبعت campaign_id أو adset_id', { status: 400 });
  }
  const body: Args = {};
  if (args.daily_budget !== undefined) body.daily_budget = Math.round(Number(args.daily_budget));
  if (args.lifetime_budget !== undefined)
    body.lifetime_budget = Math.round(Number(args.lifetime_budget));
  if (body.daily_budget === undefined && body.lifetime_budget === undefined) {
    throw new MetaApiError('لازم تبعت daily_budget أو lifetime_budget', { status: 400 });
  }
  if (args.bid_amount !== undefined) body.bid_amount = Math.round(Number(args.bid_amount));

  await metaPost(id, body);
  return metaGet(id, { fields: 'id,name,daily_budget,lifetime_budget,bid_amount,status' });
}
