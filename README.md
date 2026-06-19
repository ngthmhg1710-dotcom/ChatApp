# Chat App

Ứng dụng chat thời gian thực sử dụng Docker và MongoDB.

## Thành viên

* Nguyễn Thị Hương
* Đặng Hân Hân
* Phạm Thị Cẩm Giang

## Công nghệ sử dụng

* Node.js
* MongoDB
* Docker
* Docker Compose

## Cài đặt và chạy

Trong thư mục **Source Code**, mở Terminal và chạy:

```bash
docker-compose up
```

Sau khi khởi động thành công, truy cập:

```text
http://localhost/
```

## Cơ sở dữ liệu

Kết nối MongoDB bằng MongoDB Compass với URI:

```text
mongodb://admin:password123@127.0.0.1:27017/chatapp?authSource=admin&directConnection=true
```

Database chính:

* `chatapp`

Collections:

* `users`
* `messages`

## Tài khoản mặc định

**Admin**

* Username: `admin`
* Password: `password123`

## Video Demo

https://www.youtube.com/watch?v=2cLlJjDw2ME

## Ghi chú

File `docker-compose.yml` đã được cung cấp trong source code.
