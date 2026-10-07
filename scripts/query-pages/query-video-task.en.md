## Usage and cost

When `status` is `completed`, the response includes a `usage` object with the final amount charged for the task:

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

- `usage.cost` is the settled amount in USD after any post-completion adjustment; it matches the cost shown in the dashboard.
- Token fields are present only when the upstream provider reports token usage; most resolution/duration-based video models return `cost` only.
- `usage` is absent while the task is `pending` or `processing` and on `failed` tasks.
