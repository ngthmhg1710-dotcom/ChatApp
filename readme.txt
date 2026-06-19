# Chat App

Ứng dụng chat thời gian thực sử dụng Docker, Node.js và MongoDB.

## Thành viên

* Nguyễn Thị Hương
* Đặng Hân Hân
* Phạm Thị Cẩm Giang

## Công nghệ sử dụng

* Node.js
* MongoDB
* Docker
* Docker Compose

## Chạy dự án

Trong thư mục **Source Code**, mở Terminal và chạy:

```bash
docker-compose up
```

Sau khi khởi động thành công, truy cập:

```text
http://localhost/
```

## Cơ sở dữ liệu

Dự án sử dụng MongoDB.

Kết nối bằng MongoDB Compass với URI:

```text
mongodb://admin:password123@127.0.0.1:27017/chatapp?authSource=admin&directConnection=true
```

Dữ liệu chính nằm trong database:

```text
chatapp
```

Các collection quan trọng:

* `users` - Thông tin tài khoản
* `messages` - Dữ liệu tin nhắn

## Tài khoản Admin

```text
Username: admin
Password: password123
```

## Demo

https://www.youtube.com/watch?v=2cLlJjDw2ME
