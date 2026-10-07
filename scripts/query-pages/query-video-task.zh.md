## 用量与费用

`status` 为 `completed` 时，响应会包含 `usage` 对象，记录该任务的最终扣费金额：

```json
{
  "task_id": "vid_task_01JEXAMPLE",
  "status": "completed",
  "result": ["https://cdn.example.com/generated.mp4"],
  "completed_at": 1786358400,
  "usage": {
    "completion_tokens": 123,
    "total_tokens": 456,
    "cost": 0.053
  }
}
```

- `usage.cost` 是完成后多退少补结算后的最终金额（美元），与控制台显示的费用一致。
- token 字段仅在上游提供商上报 token 用量时出现；大多数按分辨率或时长计费的视频模型只返回 `cost`。
- 任务处于 `pending`、`processing` 或 `failed` 时不返回 `usage`。
