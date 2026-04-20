File docker-compose.uml đã có sẵn trong source code.

Cách chạy code:
Vào Source Code, mở terminal và chạy lệnh:

docker-compose up

Sau đó vào:

http://localhost/

sẽ tự động nhảy ra trang đăng nhập.

Để kiểm tra database thì sử dụng MongoDB, tạo mới bằng cách Add New Connection sau đó dán link này vào phần URI:

mongodb://admin:password123@127.0.0.1:27017/chatapp?authSource=admin&directConnection=true

Sau đó nhấn Connect thì sẽ kết nối thành công. Dữ liệu chính sẽ nằm ở mục tên là chatapp. Hai mục chính là mục messages là mục lưu trữ tin nhắn, users là mục tài khoản.

Tài khoản admin (trong bài đã tự động tạo):
admin
password123

Link video demo: 
