提供一個完整的 Node.js + Express + Firestore 會員訂單查詢系統的範例, 包含：
 - 完整的 CRUD API
 - 分頁查詢
 - 多條件篩選
 - 索引設定
 - 測試資料生成
 - 程式和資料的部屬步驟
 - 如果要完整移除專案所有的部屬資料, 步驟該怎麼做


追加 plan 項目
 - 需另外再設計不用 token 驗證的 api, 如瀏覽商品 api
 - git 本地中文 commit, user.name: scottchayaa, user.email: mmx112945@gmail.com
 - plan 規劃好的內容記錄至 CLAUDE.md 方便後續參考


給我 firebase-service-account.json 的設定範例
 - 裡面的參數相關資料該從哪裡取得


firebase-service-account.json 跟 .env 一樣是個隱私的項目
通常專案都會怎麼管理這個私有項目?
docker build 適合將這個東西打包進去嗎


```
PERMISSION_DENIED: Cloud Firestore API has not been used in project liang-dev before or it is disabled. Enable it by visiting https://console.developers.google.com/apis/api/fi
```

執行 npm run seed 後出現錯誤, 請問該怎麼處理?


我無法執行 firebase deploy --only firestore:rules
```
firebase: command not found
```s
請問要如何處理?


執行這段後, firebase deploy --only firestore:rules,firestore:indexes   發生錯誤:
```
Error: Not in a Firebase app directory (could not locate firebase.json)
```


members 的資料調整 :
- 新增 password 欄位, 存入 firestore 需要加密
- 密碼都預設是 `qwer1234`
會員訂單資料查詢
- member 需要先確認 email 和 password, 取得 token 後, 才能瀏覽到自己的訂單資料, 這邊的 token 機制是否適合套用 firebase auth?
後臺管理者的訂單資料查詢
- 事先在 firebase 註冊好會員? 這邊的流程我不太懂