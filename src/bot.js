const axios = require('axios');

// config
const COOKIES = {
  did: 'd631d10f-0a20-4c73-8731-9ee44be23bbb',
  csid: '052d489dca9a2fe40c',
};

const TOKENS = {
  sAccessToken: 'eyJraWQiOiJkLTE3ODUwNjM0NjI2NTEiLCJ0eXAiOiJKV1QiLCJ2ZXJzaW9uIjoiNCIsImFsZyI6IlJTMjU2In0.eyJpYXQiOjE3ODU2ODU3MzgsImV4cCI6MTc4NTY5NjUzOCwic3ViIjoiZjc1ZTVmMGEtODQ3Yy00YTY1LTgyMWEtOWJmYTBlMWQzMTIyIiwidElkIjoicHVibGljIiwic2Vzc2lvbkhhbmRsZSI6ImJiODIxOGRjLTYzODMtNDViMS1iZTliLTFhNWQ2MDBlMTM0MCIsInJlZnJlc2hUb2tlbkhhc2gxIjoiY2NhOWZmOWQ2MjFmMTZjZTJiOTA5NTM2MGMzYjNkYjJkOGY5NWNlZGEwN2RlYmVkMTg3OTI4NTFhNTQ1YzFmNyIsInBhcmVudFJlZnJlc2hUb2tlbkhhc2gxIjpudWxsLCJhbnRpQ3NyZlRva2VuIjpudWxsLCJpc3MiOiJodHRwczovL2FwaS5kaXZhci5pci92OC9hdXRoZW50aWNhdGUiLCJwaG9uZU51bWJlciI6Iis5ODkxNTMwNjc1ODQiLCJzdC1wZXJtIjp7InQiOjE3ODU2ODU3Mzg2MDIsInYiOltdfSwic3Qtcm9sZSI6eyJ0IjoxNzg1Njg1NzM4NjAyLCJ2IjpbXX19.GC9uel0t4n-dv1nlfhcE6J5ZfvqQHO1ahbAf2CR498cbERvbpUhdETo95bA8G4Ap450m3oHMCMaTBg2A3pWYgenvrONF6vyqZ83cF7973gHVdZRO-2pLi7AAHVeK4h7H5YvLzwIDH-Eltf3DKjAw_-eXkkztUR4paLRvNetmmUtnYrGWrspYD4WmuS2LXp5yhnAEE1FNT-IrySS4zzrwcFdz9LCdUNT9HDYWdu6947vRdwbJxYPNyESiWap19u1fSoBr8YIMTY3wuE3dhH8rmYPDqjltEMA0RhowI4dHR5BEofzmlLWTCG9Qbr84CcAHR0IkliFtSSTFJzCKRzYMfA',
  sFrontToken: 'eyJ1aWQiOiJmNzVlNWYwYS04NDdjLTRhNjUtODIxYS05YmZhMGUxZDMxMjIiLCJhdGUiOjE3ODU2OTY1MzgwMDAsInVwIjp7ImFudGlDc3JmVG9rZW4iOm51bGwsImV4cCI6MTc4NTY5NjUzOCwiaWF0IjoxNzg1Njg1NzM4LCJpc3MiOiJodHRwczovL2FwaS5kaXZhci5pci92OC9hdXRoZW50aWNhdGUiLCJwYXJlbnRSZWZyZXNoVG9rZW5IYXNoMSI6bnVsbCwicGhvbmVOdW1iZXIiOiIrOTg5MTUzMDY3NTg0IiwicmVmcmVzaFRva2VuSGFzaDEiOiJjY2E5ZmY5ZDYyMWYxNmNlMmI5MDk1MzYwYzNiM2RiMmQ4Zjk1Y2VkYTA3ZGViZWQxODc5Mjg1MWE1NDVjMWY3Iiwic2Vzc2lvbkhhbmRsZSI6ImJiODIxOGRjLTYzODMtNDViMS1iZTliLTFhNWQ2MDBlMTM0MCIsInN0LXBlcm0iOnsidCI6MTc4NTY4NTczODYwMiwidiI6W119LCJzdC1yb2xlIjp7InQiOjE3ODU2ODU3Mzg2MDIsInYiOltdfSwic3ViIjoiZjc1ZTVmMGEtODQ3Yy00YTY1LTgyMWEtOWJmYTBlMWQzMTIyIiwidElkIjoicHVibGljIn19',
};

// proxy config
const proxyUrl = 'http://192.168.154.12:8080';

// base client
const client = axios.create({
  baseURL: 'https://api.divar.ir/v8',
  proxy: false, // مهم: چون از Every Proxy استفاده می‌کنیم
  headers: {
    'User-Agent': 'Mozilla/5.0',
    'Cookie': [
      `did=${COOKIES.did}`,
      `csid=${COOKIES.csid}`,
      `sAccessToken=${TOKENS.sAccessToken}`,
      `sFrontToken=${TOKENS.sFrontToken}`,
    ].join('; '),
    Authorization: `Bearer ${TOKENS.sAccessToken}`,
  },
  // تنظیمات پروکسی
  proxy: {
    host: '192.168.154.12',
    port: 8080,
  },
});

// fetch listings
async function fetchListings(params) {
  const body = {
    json_schema: {
      category: params.category,
      city: params.city,
      query: '',
      sort: { sort_by: 'date' },
    },
  };

  const res = await client.post('/search', body);
  return res.data?.web_widgets?.post_list || [];
}

// listener
async function startListener() {
  let lastIds = new Set();

  setInterval(async () => {
    try {
      const posts = await fetchListings({
        city: 'mashhad',
        category: 'apartment-rent',
      });

      for (const p of posts) {
        const id = p.data?.token;
        if (!id || lastIds.has(id)) continue;

        lastIds.add(id);
        console.log(`[NEW] ${p.data?.title} | ${p.data?.token}`);
      }

      if (lastIds.size > 5000) {
        lastIds = new Set([...lastIds].slice(-2000));
      }

    } catch (e) {
      console.error('listener error', e.message);
    }
  }, 8000);
}

startListener();
