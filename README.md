# 绿优源官网与商品管理后台

这个项目包含三个部分：

- `website`：企业官网，展示公司介绍、品牌矩阵、商品特色、商品详情页、合作方式和联系方式
- `admin`：品牌与商品管理后台，支持品牌展示控制、商品绑定品牌、上下架、主推设置和详情页模块编辑
- `server`：轻量 API 服务，负责给官网和后台提供商品数据

## 本地启动

1. 安装全部依赖

```bash
npm run setup
```

2. 一键启动三个服务

```bash
npm run dev
```

默认地址：

- 官网：[http://localhost:5173](http://localhost:5173)
- 后台：[http://localhost:5174](http://localhost:5174)
- API：[http://localhost:4000/api](http://localhost:4000/api)

## 单独启动

```bash
npm run dev:server
npm run dev:website
npm run dev:admin
```

## 数据库初始化

后端现在默认连接 MySQL，并使用以下库名：

- 数据库名：`lvyouyuan`

首次接入或需要重新导入演示数据时，可在 `server` 目录执行：

```bash
npm run setup-db
```

## 构建

```bash
npm run build
```

## 当前实现说明

- 后端数据现已存放在 MySQL 数据库 `lvyouyuan`
- `server/data/products.json`、`server/data/brands.json`、`server/data/admins.json` 现在作为初始化种子数据使用
- 后台修改商品后，官网刷新即可读取最新展示内容
- 后台支持品牌管理，并可控制品牌是否在官网品牌专区展示
- 商品必须绑定品牌，品牌既可以是绿优源旗下品牌，也可以是合作品牌
- 商品支持独立详情页，详情内容可通过后台插入文本、富文本、图片、视频、图集、卖点、参数、资料下载和引用等模块
- 后台现已接入手机号 + 密码登录
- 后台账号不支持自行注册，需由系统管理员在后台创建
- 当前系统管理员手机号为 `15915310173`
- 新建账号可设置初始密码，默认可使用 `111111`
- 登录后支持在后台直接修改密码
