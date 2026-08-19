// 错误提示条: 错误信息 + 重试按钮

import { Alert, Button } from 'antd';

interface Props {
  error: string | null;
  onRetry: () => void;
}

export default function ErrorBanner({ error, onRetry }: Props) {
  if (!error) return null;
  return (
    <Alert
      type="error"
      showIcon
      message="出错了"
      description={error}
      style={{ margin: 12 }}
      action={
        <Button size="small" danger onClick={onRetry}>
          重试
        </Button>
      }
      closable
    />
  );
}
