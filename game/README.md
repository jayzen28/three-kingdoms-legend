# 三國LEGEND 單機版 — 部署到 Cloudflare

這包是遊戲的全部檔案（`public/`）加上部署設定（`wrangler.jsonc`）。

## 部署（在這個資料夾裡執行）

```
npx wrangler login      # 第一次才需要，會開瀏覽器登入 Cloudflare
npx wrangler deploy
```

完成後終端機會印出網址，格式是 `https://sanguo-legend.<你的帳號>.workers.dev`。

## 之後更新
把新版檔案覆蓋到 `public/`，再跑一次 `npx wrangler deploy`。

## 備註
- 目前是單機版：存檔在玩家自己的瀏覽器裡，還沒有帳號、雲端存檔、連線對戰。
- `js/data.js` 的茶館 SSR、UR 機率現在是測試值 1/6000，正式上線前要調回。
