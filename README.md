# Industrial Defect Detection Demo

面向工业外观缺陷检测的最小可运行 Demo。当前版本先验证完整业务闭环，推理结果由可重复的 Mock 引擎生成；后续可在统一结果结构下替换为 ONNX 模型。

## 已跑通功能

- 创建、查看检测批次
- 批量上传 JPG / PNG 等图片
- 自动生成 OK / NG、缺陷类别、置信度和检测框
- 人工复核并修改判定
- 查看批次统计并导出 CSV
- JSON 文件持久化，重启后数据仍在
- 开发文档与 Demo 随同一个 JAR 发布

## 本地运行

需要 Java 21。IDEA 直接打开本目录中的 `pom.xml`，运行 `DemoApplication`；也可双击 `start.bat` 或执行：

```powershell
.\mvnw.cmd spring-boot:run
```

- Demo: <http://127.0.0.1:8080/demo/>
- 开发文档: <http://127.0.0.1:8080/demo/docs/>
- 健康检查: <http://127.0.0.1:8080/demo/api/health>

## 验证与打包

```powershell
.\mvnw.cmd test
.\mvnw.cmd package
```

运行数据默认写入 `data/runtime/`，该目录不提交 Git。生产环境可通过 `DEMO_DATA_DIR` 修改位置。

