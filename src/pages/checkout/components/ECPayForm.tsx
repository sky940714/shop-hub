import React, { useEffect, useRef } from 'react';

// 定義接收的資料型別
interface ECPayParams {
  actionUrl: string;
  [key: string]: any; // 允許其他任意欄位
}

const ECPayForm = ({ params }: { params: ECPayParams | null }) => {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // 當 params 有值，且表單元素存在時，自動送出
    if (params && formRef.current) {
      console.log('正在跳轉至綠界...');
      formRef.current.submit();
    }
  }, [params]);

  if (!params) return null;

  return (
    <form 
      ref={formRef} 
      method="POST" 
      action={params.actionUrl} 
      style={{ display: 'none' }} // 隱藏表單不讓使用者看到
    >
      {Object.keys(params).map((key) => {
        if (key === 'actionUrl') return null;
        return <input key={key} type="hidden" name={key} value={params[key]} />;
      })}
    </form>
  );
};

export default ECPayForm;