import { metaGet, metaPost, metaPaginate, MetaApiError, hashNormalized, hashPhone } from '../../meta-ads';
import { resolveAlias } from '../../supabase';

type Args = Record<string, any>;

// 19
export async function list_audiences(args: Args) {
  const account = await resolveAlias(args.ad_account_id);
  const fields =
    args.fields ||
    'id,name,description,subtype,approximate_count_lower_bound,approximate_count_upper_bound,operation_status,time_created,time_updated';
  const data = await metaPaginate(`${account}/customaudiences`, { fields }, {
    maxItems: args.limit || 100,
  });
  return { count: data.length, audiences: data };
}

// 20
export async function create_custom_audience(args: Args) {
  const account = await resolveAlias(args.ad_account_id);
  if (!args.name) throw new MetaApiError('name مطلوب', { status: 400 });

  const body: Args = {
    name: args.name,
    subtype: args.subtype || 'CUSTOM',
    description: args.description,
    customer_file_source: args.customer_file_source || 'USER_PROVIDED_ONLY',
  };
  if (args.rule) body.rule = args.rule; // website/engagement audiences
  if (args.prefill !== undefined) body.prefill = args.prefill;

  const created = await metaPost(`${account}/customaudiences`, body);
  return metaGet(created.id, { fields: 'id,name,subtype,description,operation_status' });
}

/**
 * 21 — add_users_to_audience
 * بيستقبل users كـ list من objects فيها email و/أو phone.
 * الـ PII بيتعمله SHA-256 (lowercase+trim للإيميل، أرقام بس للموبايل) قبل ما يطلع
 * بره السيرفر — مفيش raw PII بيتبعت لميتا.
 */
export async function add_users_to_audience(args: Args) {
  if (!args.audience_id) throw new MetaApiError('audience_id مطلوب', { status: 400 });
  const users: Args[] = args.users || [];
  if (!Array.isArray(users) || users.length === 0) {
    throw new MetaApiError('users لازم تكون list مش فاضية', { status: 400 });
  }

  // schema: نحدد الأعمدة الموجودة فعلاً
  const useEmail = users.some((u) => u.email);
  const usePhone = users.some((u) => u.phone);
  const schema: string[] = [];
  if (useEmail) schema.push('EMAIL');
  if (usePhone) schema.push('PHONE');
  if (schema.length === 0) {
    throw new MetaApiError('كل user لازم يكون فيه email أو phone على الأقل', { status: 400 });
  }

  const data = users.map((u) => {
    const row: (string | null)[] = [];
    if (useEmail) row.push(hashNormalized(u.email));
    if (usePhone) row.push(hashPhone(u.phone));
    return row;
  });

  const payload = { schema, data };
  const result = await metaPost(`${args.audience_id}/users`, {
    payload,
    session: args.session, // optional batching session
  });
  return {
    hashed_locally: true,
    schema,
    num_submitted: data.length,
    result,
  };
}

// 22
export async function create_lookalike_audience(args: Args) {
  const account = await resolveAlias(args.ad_account_id);
  if (!args.name) throw new MetaApiError('name مطلوب', { status: 400 });
  if (!args.origin_audience_id)
    throw new MetaApiError('origin_audience_id مطلوب (المصدر اللي هنعمل منه lookalike)', {
      status: 400,
    });

  const lookalike_spec: Args = {
    type: args.type || 'similarity',
    country: args.country, // مثال: "EG"
  };
  if (args.ratio !== undefined) lookalike_spec.ratio = args.ratio; // 0.01 - 0.20
  if (args.starting_ratio !== undefined) lookalike_spec.starting_ratio = args.starting_ratio;
  if (args.location_spec) lookalike_spec.location_spec = args.location_spec;

  const body: Args = {
    name: args.name,
    subtype: 'LOOKALIKE',
    origin_audience_id: args.origin_audience_id,
    lookalike_spec,
  };

  const created = await metaPost(`${account}/customaudiences`, body);
  return metaGet(created.id, {
    fields: 'id,name,subtype,lookalike_spec,operation_status',
  });
}
