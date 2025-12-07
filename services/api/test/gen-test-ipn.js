const crypto = require('crypto');
const querystring = require('qs'); // Hoặc dùng querystring của nodejs nếu dự án bạn dùng nó

// 1. CẤU HÌNH SECRET KEY CỦA BẠN Ở ĐÂY (Giống trong file .env)
const secretKey = 'YOUR_SECRET_KEY_HERE'; 

// 2. Dữ liệu giả lập
const vnp_Params = {
    vnp_Amount: '10000000', // 100,000 VND
    vnp_BankCode: 'NCB',
    vnp_BankTranNo: 'VNP14392658',
    vnp_CardType: 'ATM',
    vnp_OrderInfo: 'Thanh toan don hang test',
    vnp_PayDate: '20231207103000',
    vnp_ResponseCode: '00', // 00 là thành công
    vnp_TmnCode: 'TEST_TMN',
    vnp_TransactionNo: '14392658',
    vnp_TransactionStatus: '00',
    vnp_TxnRef: 'ORDER_' + Date.now(), // Mã đơn hàng unique
};

// 3. Hàm sortObject (Giống logic trong code của bạn)
function sortObject(obj) {
    let sorted = {};
    let str = [];
    let key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) {
            str.push(encodeURIComponent(key));
        }
    }
    str.sort();
    for (key = 0; key < str.length; key++) {
        sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
    }
    return sorted;
}

// 4. Tạo chữ ký (Mô phỏng lại logic server)
// Lưu ý: Code gốc của bạn dùng stringify với encode: false.
// Tùy thư viện bạn dùng (qs hay querystring) mà cách nối chuỗi sẽ khác nhau.
// Dưới đây là cách thủ công chuẩn nhất để tạo signData mà không phụ thuộc thư viện:

const sortedParams = sortObject(vnp_Params);
const signData = Object.keys(sortedParams)
    .map(key => `${key}=${sortedParams[key]}`) // Giữ nguyên, không encode lại vì sortObject đã encode rồi hoặc theo logic 'encode: false'
    .join('&');

// Nếu code server bạn dùng 'qs.stringify(sortedParams, { encode: false })' 
// thì signData thực tế là chuỗi thô chưa encode.
// Hãy đảm bảo logic dưới đây khớp với server:
const hmac = crypto.createHmac('sha512', secretKey);
const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

// 5. Thêm hash vào params
vnp_Params['vnp_SecureHash'] = signed;
vnp_Params['vnp_SecureHashType'] = 'SHA512';

console.log('--- COPY JSON DƯỚI ĐÂY ĐỂ TEST ---');
console.log(JSON.stringify(vnp_Params, null, 2));