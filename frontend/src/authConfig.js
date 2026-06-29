export const authConfig = {
  authority: "https://cognito-idp.ap-south-1.amazonaws.com/ap-south-1_yhJhNPkoW",

  client_id: "3o0u8leo7bs8hc0q6qcamrl42k",

  redirect_uri: window.location.origin,

  post_logout_redirect_uri: window.location.origin,

  response_type: "code",

  scope: "openid email phone",

  automaticSilentRenew: true,

  loadUserInfo: true,
}