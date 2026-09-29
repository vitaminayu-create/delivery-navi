/*
 * 配送ナビ：手続き・利用案内のデータ
 * このファイルを編集して情報を更新できます。
 * 一番下の「};」は消さないでください。
 */
window.DELIVERY_NAVI_DATA = window.DELIVERY_NAVI_DATA || {};
window.DELIVERY_NAVI_DATA.procedures = {
  "items": [
    {
      "id": "deposit",
      "title": "出資金",
      "summary": "加入時1,000円、利用中は月500円を積立、脱退時に返還。振込手数料は組合員負担。",
      "hasFaqLink": true
    },
    {
      "id": "payment",
      "title": "支払い方法",
      "summary": "クレジットカードは利用不可。",
      "hasFaqLink": true
    },
    {
      "id": "basic_fee",
      "title": "基本手数料",
      "summary": "注文がない週も165円（税込）。お届け合計3,000円（税抜）以上で無料。",
      "hasFaqLink": true
    },
    {
      "id": "delivery_pause",
      "title": "配達のお休み",
      "summary": "通常は連絡不要。カタログも不要な場合や長期のお休みは、2週間前までに電話かWeb注文の問い合わせフォームで連絡。",
      "hasFaqLink": true
    },
    {
      "id": "web_order_account",
      "title": "Web注文の登録・パスワード再設定",
      "summary": null,
      "hasFaqLink": true
    },
    {
      "id": "delivery_time",
      "title": "配達日時",
      "summary": "エリアごとに固定で、選べません。",
      "hasFaqLink": true
    },
    {
      "id": "unattended_delivery",
      "title": "不在時の置き配・オートロックマンション",
      "summary": null,
      "hasFaqLink": true
    },
    {
      "id": "withdrawal",
      "title": "脱退",
      "isSpecial": true,
      "note": "手順はここには表示しません。お電話で事務所へおつなぎください。",
      "officePhone": "042-316-9405",
      "officeHours": "平日9:00〜17:00",
      "recordButtonLabel": "脱退理由を記録する",
      "memoCategoryPreset": "脱退の相談"
    },
    {
      "id": "referral",
      "title": "紹介",
      "status": "データ準備中"
    },
    {
      "id": "maicle",
      "title": "まいくる便",
      "status": "データ準備中"
    }
  ]
};
