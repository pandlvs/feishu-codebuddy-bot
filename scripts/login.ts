/**
 * 一次性登录脚本，运行后在浏览器完成授权即可
 * 运行: npx tsx scripts/login.ts
 */
import 'dotenv/config';
import { unstable_v2_authenticate } from '@tencent-ai/agent-sdk';

async function main() {
  console.log('正在启动 CodeBuddy 登录流程...\n');

  // 读取环境变量配置
  const environment = process.env.CODEBUDDY_ENVIRONMENT as 'external' | 'internal' | 'ioa' | 'cloudhosted' | undefined;
  const endpoint = process.env.CODEBUDDY_ENDPOINT;

  if (environment && endpoint) {
    console.warn('⚠️  警告: CODEBUDDY_ENVIRONMENT 和 CODEBUDDY_ENDPOINT 同时配置，将使用 CODEBUDDY_ENVIRONMENT\n');
  }

  const authOptions: any = {
    onAuthUrl: async (authState) => {
      console.log('authState:', JSON.stringify(authState, null, 2));
      const url = (authState as any).url ?? (authState as any).authUrl ?? (authState as any).loginUrl ?? (authState as any).uri;
      console.log('请在浏览器中打开以下链接完成授权：');
      console.log('\n' + url + '\n');
    },
  };

  if (environment) {
    authOptions.environment = environment;
    console.log(`使用预定义环境: ${environment}\n`);
  } else if (endpoint) {
    authOptions.endpoint = endpoint;
    console.log(`使用自定义 endpoint: ${endpoint}\n`);
  } else {
    console.log('使用默认配置\n');
  }

  try {
    const result = await unstable_v2_authenticate(authOptions);

    console.log('✅ 登录成功！');
    console.log(`   用户: ${result.userinfo.userName || result.userinfo.userId}`);
    console.log('\ntoken 已保存，现在可以运行 npm run dev 启动机器人。');
  } catch (error) {
    console.error('❌ 登录失败:', error);
    process.exit(1);
  }
}

main();
