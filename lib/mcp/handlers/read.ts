import { metaGet, metaPaginate } from '../../meta-ads';
import { resolveAlias } from '../../supabase';

type Args = Record<string, any>;

const ACCOUNT_FIELDS =
  'id,account_id,name,account_status,currency,timezone_name,amount_spent,balance,spend_cap,business_name';
const CAMPAIGN_FIELDS =
  'id,name,status,effective_status,objective,buying_type,daily_budget,lifetime_budget,special_ad_categories,created_time,updated_time';
const ADSET_FIELDS =
  'id,name,status,effective_status,campaign_id,daily_budget,lifetime_budget,billing_event,optimization_goal,bid_amount,start_time,end_time,targeting';
const AD_FIELDS = 'id,name,status,effective_status,adset_id,campaign_id,creative,created_time,updated_time';

// 1
export async function list_ad_accounts(_args: Args) {
  const data = await metaPaginate('me/adaccounts', { fields: ACCOUNT_FIELDS }, { maxItems: 200 });
  return { count: data.length, ad_accounts: data };
}

// 2
export async function get_account_details(args: Args) {
  const account = await resolveAlias(args.ad_account_id);
  const fields = args.fields || ACCOUNT_FIELDS;
  return metaGet(account, { fields });
}

// 3
export async function list_campaigns(args: Args) {
  const account = await resolveAlias(args.ad_account_id);
  const params: Args = { fields: args.fields || CAMPAIGN_FIELDS };
  if (args.effective_status) params.effective_status = args.effective_status;
  const data = await metaPaginate(`${account}/campaigns`, params, {
    maxItems: args.limit || 100,
  });
  return { count: data.length, campaigns: data };
}

// 4 — accepts either a campaign_id or an ad_account_id
export async function list_adsets(args: Args) {
  const fields = args.fields || ADSET_FIELDS;
  let parent: string;
  if (args.campaign_id) {
    parent = `${args.campaign_id}/adsets`;
  } else {
    const account = await resolveAlias(args.ad_account_id);
    parent = `${account}/adsets`;
  }
  const data = await metaPaginate(parent, { fields }, { maxItems: args.limit || 100 });
  return { count: data.length, adsets: data };
}

// 5 — accepts adset_id, campaign_id, or ad_account_id
export async function list_ads(args: Args) {
  const fields = args.fields || AD_FIELDS;
  let parent: string;
  if (args.adset_id) parent = `${args.adset_id}/ads`;
  else if (args.campaign_id) parent = `${args.campaign_id}/ads`;
  else {
    const account = await resolveAlias(args.ad_account_id);
    parent = `${account}/ads`;
  }
  const data = await metaPaginate(parent, { fields }, { maxItems: args.limit || 100 });
  return { count: data.length, ads: data };
}

// 6
export async function get_ad_creative(args: Args) {
  const creativeFields =
    'id,name,title,body,object_story_spec,image_url,thumbnail_url,call_to_action_type,effective_object_story_id,instagram_permalink_url';
  if (args.creative_id) {
    return metaGet(args.creative_id, { fields: creativeFields });
  }
  // resolve through the ad
  const ad = await metaGet(args.ad_id, { fields: `creative{${creativeFields}}` });
  return ad.creative ?? ad;
}

// 7
export async function list_pages(_args: Args) {
  const data = await metaPaginate(
    'me/accounts',
    { fields: 'id,name,category,access_token,tasks,instagram_business_account{id,username}' },
    { maxItems: 200 }
  );
  // strip page access tokens from the response — not needed by the model
  const pages = data.map((p: any) => {
    const { access_token, ...rest } = p;
    return rest;
  });
  return { count: pages.length, pages };
}

// 8
export async function list_instagram_accounts(args: Args) {
  if (args.page_id) {
    const page = await metaGet(args.page_id, {
      fields: 'instagram_business_account{id,username,name,profile_picture_url,followers_count}',
    });
    const iga = page.instagram_business_account;
    return { instagram_accounts: iga ? [iga] : [] };
  }
  // fall back: scan all pages
  const pages = await metaPaginate(
    'me/accounts',
    { fields: 'id,name,instagram_business_account{id,username,name,followers_count}' },
    { maxItems: 200 }
  );
  const accounts = pages
    .filter((p: any) => p.instagram_business_account)
    .map((p: any) => ({ page_id: p.id, page_name: p.name, ...p.instagram_business_account }));
  return { count: accounts.length, instagram_accounts: accounts };
}

// 9
export async function get_campaign_insights(args: Args) {
  const objectId = args.campaign_id || args.adset_id || args.ad_id || (await resolveAlias(args.ad_account_id));
  const params: Args = {
    fields:
      args.fields ||
      'campaign_name,adset_name,ad_name,impressions,reach,clicks,ctr,cpc,cpm,spend,actions,action_values,purchase_roas,frequency',
    level: args.level || 'campaign',
  };
  if (args.date_preset) params.date_preset = args.date_preset;
  else if (args.time_range) params.time_range = args.time_range;
  else params.date_preset = 'last_30d';
  if (args.breakdowns) params.breakdowns = args.breakdowns;
  if (args.time_increment) params.time_increment = args.time_increment;

  const data = await metaPaginate(`${objectId}/insights`, params, { maxItems: args.limit || 100 });
  return { count: data.length, insights: data };
}
