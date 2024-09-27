import { Ref, ref, toValue } from 'vue'

/**
 * Promise延迟执行函数
 * @param {number} [delay=200] - 延迟的毫秒数，默认为200毫秒
 * @returns {Promise<void>} - 返回一个在指定延迟后解析的Promise
 */
export function sleep(delay = 200): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, delay)
  })
}

/**
 * 将字符串解析为JSON对象
 * @template T - JSON对象的类型
 * @param {string} str - 要解析的字符串
 * @returns {T | null} - 解析成功返回JSON对象，解析失败返回null
 */
export function str2json<T = any>(str: string): T | null {
  try {
    return JSON.parse(str)
  } catch (error) {
    return null
  }
}

/**
 * 发送POST请求到指定的URL
 * @template P - 请求参数的类型
 * @param {string} url - 请求的URL
 * @param {P} params - 请求的参数
 * @param {RequestInit} [requestConfig] - 可选的请求配置
 * @returns {Promise<Response>} - 返回一个包含响应的Promise
 */
export const fetchApi = <P = any>(
  url: string,
  params: P,
  requestConfig?: RequestInit
): Promise<Response> => {
  return fetch(url, {
    method: 'POST',
    body: JSON.stringify(params),
    headers: {
      'Content-Type': 'application/json',
    },
    ...requestConfig,
  })
}

/**
 * 处理数据字符串并更新引用的当前值
 * @template R - 解析结果的类型
 * @param {string} str - 要处理的数据字符串
 * @param {Ref<R | undefined>} current - 用于存储解析结果的引用
 * @returns {Promise<boolean>} - 解析成功返回true，解析失败返回false
 */
const handleData = async <R>(str: string, current: Ref<R | undefined>): Promise<boolean> => {
  const index = str.indexOf(':')
  if (index <= 0) return false
  const parseResult = str2json<R>(str.substring(index + 1).trim())
  if (!parseResult) {
    return false
  } else {
    current.value = parseResult
  }
  return true
}

/**

 * @param reader fetch.body 的读取器
 * @param current 接受到最新的内容
 */


/**
 * 异步生成器函数，用于读取和处理数据流。
 * 后端生产较快，前端无法及时消费掉（后端返回速度较快，前端通过reader.read()读取后有一些解析渲染等操作导致不是后端反一条前端取一条），
 * fetch会将未处理消息进行合并（merge chunks）,
 * 参考https://stackoverflow.com/questions/65537989/streaming-with-fetch-api说法
 * 这里有可能将一次消息进行截断，就是无法通过json解析，所以这里做了特殊处理，当无法解析时，将内容放到下一次消息中重新解析
 * 注意，这里只有最后一条出现被截断的情况，其余都是完整的
 * @template R - 解析结果的类型
 * @param {ReadableStreamDefaultReader<string>} reader - fetch.body 的读取器
 * @param {Ref<R | undefined>} current - 用于存储解析结果的引用
 * @returns {AsyncGenerator<{ current: R; str: string }, void, unknown>} - 返回一个异步生成器，生成包含current和响应字符串的对象
 */
async function* makeReaderIterator<R>(
  reader: ReadableStreamDefaultReader<string>,
  current: Ref<R | undefined>
): AsyncGenerator<{
  current: R;
  str: string;
}, void, unknown> {
  let missingMsg = ''
  for (;;) {
    try {
      const { value, done } = await reader.read()
      if (done) {
        break
      } else {
        const structs = (missingMsg + value)
          .split(/(\r\n|\r|\n){2}/g)
          .filter((item) => !!item.trim())
        missingMsg = ''
        for (const str of structs) {
          const isSuccess = await handleData(str, current)
          if (isSuccess) {
            yield { current: toValue(current as Ref<R>), str }
            // 暂时使用sleep临时解决本地开发和生产环境输出效果不一致的问题
            await sleep(Math.floor(Math.random() * 10) + 5)
          } else {
            missingMsg += str
          }
        }
      }
    } catch (error) {
      console.warn('数据流读取错误：', error)
      throw new Error('数据流读取错误！')
    }
  }
}

/**
 * 自定义钩子，用于发起流式fetch请求并处理响应数据。
 * @template R 响应数据的类型
 * @template T 请求函数的类型，默认为fetchApi函数类型
 * @param {T} [request=fetchApi as T] 请求函数，默认为fetchApi
 * @returns {{ current: Ref<R | undefined>, fetchStream: (...args: Parameters<T>) => Promise<AsyncGenerator<{ current: R; str: string }>> }} 返回包含current和fetchStream的对象
 */
export const useFetchstream = <
  R = any,
  T extends (...args: any[]) => any = typeof fetchApi
>(
  request: T = fetchApi as T
) => {
  const current = ref<R>()

  /**
   * 发起流式fetch请求并处理响应数据。
   * @param {...Parameters<T>} args 请求参数
   * @returns {Promise<AsyncGenerator<{ current: R; str: string }>>} 返回一个异步生成器，生成包含current和响应字符串的对象
   */
  async function fetchStream(
    ...args: Parameters<T>
  ): Promise<AsyncGenerator<{ current: R; str: string }>> {
    // 调用请求时current会被初始化，因为消息是纯文字时，需要前端自己累加，不初始化时消息内容会叠加到一块
    current.value = undefined
    const response = await request(...args)
    if (!response.ok) {
      throw new Error('fetch请求错误！')
    }
    const reader = response
      .body!.pipeThrough(new TextDecoderStream())
      .getReader()
    return makeReaderIterator<R>(reader, current)
  }
  return { current, fetchStream }
}
