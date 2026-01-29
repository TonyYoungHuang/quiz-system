import { OrmClient, OrmRawQueryClient } from '@cloudbase/model';
import { IMySqlClient } from '@cloudbase/mysql';
import { authModels } from '@cloudbase/oauth';
import type {
  SignInRes,
  GetUserRes,
  CommonRes,
  SignInWithOtpRes,
  SignInOAuthRes,
  GetClaimsRes,
  ResetPasswordForEmailRes,
  GetUserIdentitiesRes,
  LinkIdentityRes,
  ReauthenticateRes,
  ResendRes,
  UpdateUserWithVerificationRes,
  OnAuthStateChangeCallback,
  SignInWithPasswordReq,
  SignInWithIdTokenReq,
  SignInWithOAuthReq,
  VerifyOAuthReq,
  VerifyOtpReq,
  LinkIdentityReq,
  UnlinkIdentityReq,
  UpdateUserReq,
  SignInWithOtpReq,
  ResetPasswordForOldReq,
  ResendReq,
  SetSessionReq,
  DeleteMeReq,
  SignUpRes
} from '@cloudbase/auth';
import { AI } from '@cloudbase/ai';
import { CloudbaseAdapter, ResponseObject } from '@cloudbase/adapter-interface'
import { ICloudbaseUpgradedConfig, ICloudbase, Persistence } from '@cloudbase/types'
import { LANGS } from '@cloudbase/types'
import { ICustomReqOpts } from '@cloudbase/types/functions'

type KV<T> = {
  [key: string]: T
}

type ExcludeOf<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>


declare type MethodType = 'request' | 'post' | 'get' | 'head' | 'patch' | 'delete' | 'put'

interface ICallApiOptions {
  /** 请求的path */
  path?: string
  /**请求方法 */
  method?: MethodType
  /**请求头 */
  headers?: KV<any>
  /** 请求体，根据content-type可以是不同类型 */
  body?: KV<any> | string
  /**可传token，如果没有传值，则默认用当前登录的token */
  token?: string
}

interface ICloudbaseApis {
  [apiName: string]: {
    [method in MethodType]: (callApiOptions: ICallApiOptions, opts?: KV<any>) => Promise<ResponseObject['data']>
  }
}

/**
 * module
 */
declare namespace cloudbase {
  interface SimpleStorage {
    getItem: (key: string) => Promise<string | null>
    removeItem: (key: string) => Promise<void>
    setItem: (key: string, value: string) => Promise<void>
    getItemSync: (key: string) => string | null
    removeItemSync: (key: string) => void
    setItemSync: (key: string, value: string) => void
  }

  interface ICloudbaseConfig {
    env: string
    region?: string
    timeout?: number
    persistence?: Persistence
    oauthClient?: any
    debug?: boolean
    _fromApp?: ICloudbase
    clientId?: string
    oauthInstance?: any
    wxCloud?: any
    i18n?: {
      t: (text: string) => string
      LANG_HEADER_KEY: string
      lang: LANGS
    }
    accessKey?: string
    endPointMode?: EndPointKey
  }

  interface ICloudbaseExtension {
    name: string
    invoke(opts: any, app: ICloudbase): Promise<any>
  }

  interface Listeners {
    [key: string]: Function[]
  }

  interface ICloudbaseEvent {
    name: string
    target: any
    data: any
  }

  interface ICloudbaseEventEmitter {
    on(name: string, listener: Function): this
    off(name: string, listener: Function): this
    fire(event: string | ICloudbaseEvent, data?: any): this
  }

  interface ICloudbaseComponent {
    name: string
    entity: any
    namespace?: string
    injectEvents?: {
      bus: ICloudbaseEventEmitter
      events: string[]
    }
    IIFE?: boolean
  }

  interface ICloudbaseHook {
    entity: any
    target: string
  }

  type EndPointKey = 'CLOUD_API' | 'GATEWAY'

  interface ISetEndPointWithKey {
    key: EndPointKey
    url?: string
    protocol?: 'http' | 'https'
  }

  /**
   * 初始化Cloudbase
   *
   * @example
   * ```javascript
   * const app = cloudbase.init({
   *   env: 'your-envid',
   *   timeout: 15000
   * });
   * ```
   *
   * @param config 初始化配置
   * @param config.env 环境ID
   * @param config.timeout 【可选】网络请求超时上限，单位`ms`，默认值`15000`
   *
   * @return {!cloudbase.app.App} 初始化成功的Cloudbase实例
   */
  function init(config: ICloudbaseConfig & { lang?: LANGS }): cloudbase.app.App

  function updateConfig(config: ICloudbaseUpgradedConfig): void

  function updateLang(lang: LANGS): void
  /**
   * 使用适配器，使用方式参考 {@link https://docs.cloudbase.net/api-reference/webv3/adapter#%E7%AC%AC-1-%E6%AD%A5%E5%AE%89%E8%A3%85%E5%B9%B6%E5%BC%95%E5%85%A5%E9%80%82%E9%85%8D%E5%99%A8}
   *
   * @example
   * ```javascript
   * cloudbase.useAdapters(adapter); // 使用单个适配器
   * cloudbase.useAdapters([         // 使用多个适配器
   *   adapterA,
   *   adapterB
   * ]);
   * ```
   *
   * @param adapters 适配器对象，入参可以为单个适配器对象，也可以是多个适配器对象的数组
   * @param options 适配器参数，可以在genAdapter中获取到该参数
   */
  function useAdapters(adapters: CloudbaseAdapter | CloudbaseAdapter[], options?: any): void
  /**
   * 注册扩展能力插件，使用方式参考 {@link https://docs.cloudbase.net/extension/abilities/image-examination.html#shi-yong-kuo-zhan}
   *
   * @example
   * ```javascript
   * cloudbase.registerExtension(ext);
   * ```
   *
   * @param ext 扩展能力插件对象
   */
  function registerExtension(ext: ICloudbaseExtension): void
  /**
   * 【谨慎操作】注册SDK的版本
   *
   * @example
   * ```javascript
   * cloudbase.registerVersion('1.2.1');
   * ```
   *
   * @param version SDK版本
   */
  function registerVersion(version: string): void
  /**
   * 【谨慎操作】注册SDK的名称
   *
   * @example
   * ```javascript
   * cloudbase.registerSdkName('cloudbase-js-sdk');
   * ```
   *
   * @param name SDK名称
   */
  function registerSdkName(name: string): void
  /**
   * 【谨慎操作】修改SDK请求的云开发服务地址
   *
   * @example
   * ```javascript
   * cloudbase.registerEndPoint('url','https');
   * ```
   *
   * @param url 服务地址
   * @param protocol 【可选】强制使用某种协议，默认与主站协议一致
   */
  function registerEndPoint(url: string, protocol?: 'http' | 'https'): void
  /**
   * 【谨慎操作】修改SDK请求的「云开发/网关」服务地址
   *
   * @example
   * ```javascript
   * cloudbase.registerEndPointWithKey({
   *   key: "GATEWAY",
   *   url: "",
   *   protocol: ""
   * });
   * ```
   *
   */
  function registerEndPointWithKey(props: ISetEndPointWithKey): void
  /**
   * 【谨慎操作】注册功能模块
   *
   * @example
   * ```javascript
   * cloudbase.registerComponent({});
   * ```
   *
   * @param component 功能模块对象
   */
  function registerComponent(component: ICloudbaseComponent): void
  /**
   * 【谨慎操作】注册hook
   *
   * @example
   * ```javascript
   * cloudbase.registerHook({});
   * ```
   *
   * @param hook hook对象
   */
  function registerHook(hook: ICloudbaseHook): void

  export interface models extends OrmClient, OrmRawQueryClient {}
}
/**
 * instance
 */
declare namespace cloudbase.app {
  interface App {
    /**
     * 创建Auth对象
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/authentication#appauth}
     *
     * @example
     * ```javascript
     * const app = cloudbase.init({
     *   env: 'your-envid'
     * });
     * const auth = app.auth({
     *   persistence: 'local'
     * });
     * ```
     *
     * @param options Auth初始化配置
     * @param options.persistence 本地登录态保留期限
     *
     * @return {!cloudbase.auth.App} Auth实例
     */
    auth: ((options?: { persistence: cloudbase.auth.Persistence }) => cloudbase.auth.App) & cloudbase.auth.App
    /**
     * 调用云函数
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/functions#callfunction}
     *
     * @example
     * ```javascript
     * const app = cloudbase.init({
     *   env: 'your-envid'
     * });
     * app.callFunction({
     *   name: 'function-name'
     *   data: {
     *     a: 1,
     *     b: 2
     *   }
     * }).then(res=>{
     *   console.log(res.result);
     * }});
     * ```
     *
     * @param options 被调用的云函数信息
     * @param options.name 云函数的名称
     * @param options.data 【可选】云函数的参数，默认为空
     * @param options.parse 【可选】设置为 `true` 时，当函数返回值为对象时，API 请求会返回解析对象，而不是 JSON 字符串，默认为`false`
     *
     * @return Promise-函数执行结果
     */
    callFunction(
      options: cloudbase.functions.ICallFunctionOptions,
      callback?: Function,
      customReqOpts?: ICustomReqOpts,
    ): Promise<cloudbase.functions.ICallFunctionResponse>
    /**
     * 调用云托管
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/cloudrun}
     *
     * @example
     * ```javascript
     * const app = cloudbase.init({
     *   env: 'your-envid'
     * });
     * app
     * .callContainer({
     * name: 'helloworld',
     * method: 'POST',
     * path: '/abc',
     * header:{
     *   'Content-Type': 'application/json; charset=utf-8'
     * },
     * data: {
     *   key1: 'test value 1',
     *   key2: 'test value 2'
     * },
     * })
     * .then((res) => {
     * console.log(res)
     * });
     * ```
     *
     * @param options 被调用的云托管信息
     * @param options.name 云托管的名称
     * @param options.data 【可选】云托管的参数，默认为空
     *
     * @return Promise-云托管执行结果
     */
    callContainer(
      options: cloudbase.functions.ICallFunctionOptions,
      customReqOpts?: ICustomReqOpts,
    ): Promise<ResponseObject>
    /**
     * 云存储-上传文件
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/storage#uploadfile}
     *
     * @example
     * ```javascript
     * const app = cloudbase.init({
     *   env: 'your-envid'
     * });
     * app.uploadFile({
     *   cloudPath: 'cloudPath',
     *   filePath: 'filePath',
     *   method: 'put',
     *   headers: {
     *      'Content-MD5': 'xxxxxx'
     *   }
     *   onUploadProgress: function(event){}
     * });
     * ```
     *
     * @param params
     * @param params.cloudPath 文件上传到云端后的绝对路径，包含文件名
     * @param params.filePath 被上传的文件对象
     * @param params.method 上传方法，默认为 put
     * @param params.headers 自定义头部字段
     * @param params.onUploadProgress 【可选】上传进度回调函数
     *
     * @return Promise-上传结果
     */
    uploadFile(
      params: cloudbase.storage.ICloudbaseUploadFileParams,
      callback?: Function,
    ): Promise<cloudbase.storage.ICloudbaseUploadFileResult>
    /**
     * 云存储-下载文件
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/storage#downloadfile}
     *
     * @example
     * ```javascript
     * const app = cloudbase.init({
     *   env: 'your-envid'
     * });
     * app.downloadFile({
     *   fileID: 'cloudPath'
     * });
     * ```
     *
     * @param params
     * @param params.fileID 要下载的文件的 `id`，在控制台云存储中查看
     *
     * @return Promise-下载结果
     */
    downloadFile(
      params: cloudbase.storage.ICloudbaseDownloadFileParams,
      callback?: Function,
    ): Promise<cloudbase.storage.ICloudbaseDownloadFileResult>
    /**
     * 云存储-批量复制文件
     *
     *
     * @example
     * ```javascript
     * const app = cloudbase.init({
     *   env: 'your-envid'
     * });
     * app.copyFile({
     *   fileList: [
     *     {
     *       srcPath: '源文件的绝对路径，包含文件名。例如 foo/bar.jpg、foo/bar/baz.jpg 等，不能包含除[0-9 , a-z , A-Z]、/、!、-、_、.、、*和中文以外的字符，使用 / 字符来实现类似传统文件系统的层级结构',
     *       dstPath: '目标文件的绝对路径，包含文件名。例如 foo/bar.jpg、foo/bar/baz.jpg 等，不能包含除[0-9 , a-z , A-Z]、/、!、-、_、.、、*和中文以外的字符，使用 / 字符来实现类似传统文件系统的层级结构',
     *       overwrite: '当目标文件已经存在时，是否允许覆盖已有文件，默认 true',
     *       removeOriginal: '复制文件后是否删除源文件，默认 false'
     *     }
     *   ]
     * });
     * ```
     *
     * @param params
     * @param params.fileList 要复制的文件信息组成的数组
     *
     * @return Promise-复制结果
     */
    copyFile(
      params: cloudbase.storage.ICloudbaseCopyFileParams,
      callback?: Function,
    ): Promise<cloudbase.storage.ICloudbaseCopyFileResult>
    /**
     * 云存储-获取文件的下载链接
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/storage#gettempfileurl}
     *
     * @example
     * ```javascript
     * const app = cloudbase.init({
     *   env: 'your-envid'
     * });
     * app.getTempFileURL({
     *   fileList: [
     *     '文件A的fileID',
     *     {
     *       fileID: '文件B的fileID',
     *       maxAge: 600 // 文件B的链接有效期，单位`ms`
     *     }
     *   ]
     * });
     * ```
     *
     * @param params
     * @param params.fileList 要下载的文件数组，数组元素可以是`string`或`Object`，如果是`string`代表文件ID，如果是`Object`可配置以下信息
     * @param params.fileList[].fileID 要下载的文件ID
     * @param params.fileList[].maxAge 下载链接的有效期，单位`ms`
     *
     * @return Promise-文件下载链接
     */
    getTempFileURL(
      params: cloudbase.storage.ICloudbaseGetTempFileURLParams,
      callback?: Function,
    ): Promise<cloudbase.storage.ICloudbaseGetTempFileURLResult>
    /**
     * 云存储-删除文件
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/storage#deletefile}
     *
     * @example
     * ```javascript
     * const app = cloudbase.init({
     *   env: 'your-envid'
     * });
     * app.deleteFile({
     *   fileList: [
     *     '文件A的fileID',
     *     '文件B的fileID'
     *   ]
     * });
     * ```
     *
     * @param params
     * @param params.fileList 要删除的文件ID数组
     *
     * @return Promise-删除结果
     */
    deleteFile(
      params: cloudbase.storage.ICloudbaseDeleteFileParams,
      callback?: Function,
    ): Promise<cloudbase.storage.ICloudbaseDeleteFileResult>

    getFileInfo(
      params: cloudbase.storage.ICloudbaseGetTempFileURLParams,
      callback?: Function,
    ): Promise<cloudbase.storage.ICloudbaseGetTempFileURLResult>
    /**
     * 云存储-获取上传元信息
     *
     *
     * @param params
     * @param callback
     */
    getUploadMetadata(params: cloudbase.storage.ICloudbaseGetUploadMetadataParams, callback?: Function): Promise<any>
    /**
     * 获取数据库实例
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database#%E8%8E%B7%E5%8F%96%E6%95%B0%E6%8D%AE%E5%BA%93%E5%AE%9E%E4%BE%8B}
     *
     * @example
     * ```javascript
     * const app = cloudbase.init({
     *   env: 'your-envid'
     * });
     * const db = app.database();
     * ```
     *
     * @return 数据库实例
     */
    database(dbConfig?: object): cloudbase.database.App
    /**
     * 调用扩展能力插件功能
     *
     * @example
     * ```javascript
     * const app = cloudbase.init({
     *   env: 'your-envid'
     * });
     * // 调用前需要先注册
     * app.registerExtension(ext);
     *
     * app.invokeExtension('扩展能力插件名称'，{
     *   // ...扩展能力插件的入参
     * });
     * ```
     *
     * @param name 扩展能力插件的名称
     * @param opts 【可选】扩展能力插件的参数，根据插件具体需求而定
     *
     * @return Promise-扩展能力插件执行结果
     */
    invokeExtension(name: string, opts: any): Promise<any>

    eventBus: any

    /**
     * 调用 数据模型 SDK
     * 
     *  {@link https://docs.cloudbase.net/model/sdk-reference/model}
     * @example 
     * ```javascript
        models.<model_name>.create() // 创建单条数据
        models.<model_name>.createMany()  // 创建多条数据
        models.<model_name>.update() // 更新单条数据
        models.<model_name>.updateMany() // 更新多条数据
        models.<model_name>.delete() // 删除单条数据
        models.<model_name>.deleteMany() // 删除多条数据
        models.<model_name>.get() // 查询单条数据
        models.<model_name>.list() // 查询多条数据
        models.$runSQL() // 执行原生 SQL 语句
      * ```
      */
    models: OrmClient & OrmRawQueryClient

    /**
     * MySQL 数据库
     * 
     * @example
     * ```javascript
     * const app = cloudbase.init({
     *   env: "xxxx-yyy"
     * });
     * 
     * app.mysql().from('todos').select().then((res) => {
     *   console.log(res.data);
     * });
     * ```
     */
    mysql: IMySqlClient;
    rdb: IMySqlClient;

    ai(): AI;

    apis: ICloudbaseApis;
  }
}
/**
 * auth
 */
declare namespace cloudbase.auth {
  type Persistence = 'local' | 'session' | 'none'

  interface IAccessTokenInfo {
    accessToken: string
    env: string
  }

  interface ILoginState {
    /**
     * 当前登录用户的信息
     */
    user: IUser
  }

  interface ICredential {
    accessToken?: string
    accessTokenExpire?: string
  }

  interface IAuthProvider {
    signInWithRedirect: () => any
  }

  /**
   * 用户信息
   */
  interface IUserInfo {
    uid?: string
    loginType?: string
    openid?: string
    wxOpenId?: string
    wxPublicId?: string
    unionId?: string
    qqMiniOpenId?: string
    customUserId?: string
    name?: string
    gender?: string
    email?: string
    username?: string
    hasPassword?: boolean
    location?: {
      country?: string
      province?: string
      city?: string
    }
    country?: string
    province?: string
    city?: string
  }

  interface IUser extends IUserInfo {
    /**
     * 更新用户信息
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/authentication#userupdate}
     *
     * @example
     * ```javascript
     * const app = cloudbase.init({
     *   env: "xxxx-yyy"
     * });
     * const auth = app.auth();
     * const user = auth.currentUser;
     * user.update({
     *   nickName: '新昵称'
     * }).then(()=>{});
     * ```
     *
     * @param userinfo 用户信息
     *
     * @return Promise
     *
     */
    update(userinfo: IUserInfo): Promise<void>
    /**
     * 刷新本地用户信息
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/authentication#userrefresh}
     *
     * @example
     * ```javascript
     * const app = cloudbase.init({
     *   env: "xxxx-yyy"
     * });
     * const auth = app.auth();
     * const user = auth.currentUser;
     * user.refresh().then(()=>{});
     * ```
     *
     * @return Promise-刷新后的用户信息
     *
     */
    refresh(): Promise<IUserInfo>
    /**
     * 同步获取本地用户信息
     */
    checkLocalInfo: () => void
    /**
     * 异步获取本地用户信息
     */
    checkLocalInfoAsync: () => Promise<void>
    linkWithTicket?: (ticket: string) => Promise<void>
    linkWithRedirect?: (provider: IAuthProvider) => void
    getLinkedUidList?: () => Promise<{ hasPrimaryUid: boolean; users: IUserInfo[] }>
    setPrimaryUid?: (uid: string) => Promise<void>
    unlink?: (loginType: 'CUSTOM' | 'WECHAT-OPEN' | 'WECHAT-PUBLIC' | 'WECHAT-UNION') => Promise<void>
  }

  interface App {
    /**
     * 获取当前登录的用户信息-同步操作
     *
     * {@link https://docs.cloudbase.net/api-reference/webv2/authentication#authhasloginstate}
     *
     * @example
     * ```javascript
     * const app = cloudbase.init({
     *   env: "xxxx-yyy"
     * });
     * const userInfo = app.auth().currentUser;
     * ```
     *
     * @return 用户信息，如果未登录返回`null`
     */
    currentUser: IUser | null
    /**
     * 获取当前登录的用户信息-异步操作，文档 {@link https://docs.cloudbase.net/api-reference/webv2/authentication#authgetcurrentuser}
     *
     * @example
     * ```javascript
     * const app = cloudbase.init({
     *   env: "xxxx-yyy"
     * });
     * app.auth().getCurrentUser().then(userInfo=>{
     *   // ...
     * });
     * ```
     *
     * @return Promise-用户信息，如果未登录返回`null`
     */
    getCurrentUser(): Promise<IUser | null>
    /**
     * 绑定手机号码
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv2/authentication#authbindphonenumber}
     *
     * @param params
     */
    bindPhoneNumber(params: authModels.BindPhoneRequest): Promise<void>
    /**
     * 绑定邮箱
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv2/authentication#authbindemail}
     *
     * @param params
     */
    bindEmail(params: authModels.BindEmailRequest): Promise<void>
    /**
     * 解除三方绑定
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv2/authentication#authunbindprovider}
     *
     * @param params
     */
    unbindProvider(params: authModels.UnbindProviderRequest): Promise<void>

    /**
     * 验证码验证
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv2/authentication#authverify}
     *
     * @param params
     */
    verify(params: authModels.VerifyRequest): Promise<authModels.VerifyResponse>
    /**
     * 获取验证码
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv2/authentication#authgetverification}
     *
     * @param params
     * @param options
     */
    getVerification(params: authModels.GetVerificationRequest, options?: { withCaptcha: boolean }): Promise<authModels.GetVerificationResponse>
    /**
     * 匿名登录
     *
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv2/authentication#authsigninanonymously}
     *
     */
    signInAnonymously(data?: { provider_token?: string }): Promise<SignInRes>
    /**
     * 小程序匿名登录
     *
     * @param params
     */
    signInAnonymouslyInWx(params?: { useWxCloud?: boolean }): Promise<ILoginState>
    /**
     * 小程序绑定OpenID
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv2/authentication#authbindopenid}
     *
     */
    bindOpenId(): Promise<void>
    /**
     * 小程序unionId静默登录
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv2/authentication#authsigninwithunionid}
     *
     */
    signInWithUnionId(): Promise<ILoginState>
    /**
     * 短信验证码登录
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv2/authentication#authsigninwithsms}
     *
     * @param params
     */
    signInWithSms(params: {
      verificationInfo?: { verification_id: string; is_user: boolean }
      verificationCode?: string
      phoneNum?: string
      bindInfo?: any
    }): Promise<ILoginState>
    /**
     * 邮箱验证码登录
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv2/authentication#authsigninwithemail}
     *
     * @param params
     */
    signInWithEmail(params: {
      verificationInfo?: { verification_id: string; is_user: boolean }
      verificationCode?: string
      email?: string
      bindInfo?: any
    }): Promise<ILoginState>
    /**
     * 设置获取自定义登录 ticket 的函数
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv2/authentication#authsetcustomsignfunc}
     *
     *
     * @param getTickFn
     */
    setCustomSignFunc(getTickFn: authModels.GetCustomSignTicketFn): void
    /**
     * 设置密码（已登录状态下，更新用户密码）
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv2/authentication#authsetpassword}
     *
     */
    setPassword(params: authModels.SetPasswordRequest): Promise<void>
    /**
     * 获取用户信息
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv2/authentication#authgetuserinfo}
     */
    getUserInfo(): Promise<IUserInfo>
    /**
     * 获取微搭插件用户信息
     *
     */
    getWedaUserInfo(): Promise<any>
    /**
     * 更新用户基本信息
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv2/authentication#authupdateuserbasicinfo}
     *
     * @param params
     */
    updateUserBasicInfo(params: authModels.ModifyUserBasicInfoRequest): Promise<void>
    /**
     * 获取本地登录态-同步操作
     *
     * {@link https://docs.cloudbase.net/api-reference/webv2/authentication#authhasloginstate}
     *
     * @example
     * ```javascript
     * const app = cloudbase.init({
     *   env: "xxxx-yyy"
     * });
     * const loginState = app.auth().hasLoginState();
     * ```
     *
     * @return 登录态信息，如果未登录返回`null`
     */
    hasLoginState(): ILoginState | null
    /**
     * 获取本地登录态-异步操作
     *
     * {@link https://docs.cloudbase.net/api-reference/webv2/authentication.html#auth-getloginstate}
     *
     * @example
     * ```javascript
     * const app = cloudbase.init({
     *   env: "xxxx-yyy"
     * });
     * app.auth().getLoginState().then(loginState=>{
     *   // ...
     * });
     * ```
     *
     * @return Promise-登录态信息，如果未登录返回`null`
     */
    getLoginState(): Promise<ILoginState | null>
    /**
     * @deprecated
     */
    getAuthHeader(): {}
    /**
     * 为已有账户绑定第三方账户
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv2/authentication#authbindwithprovider}
     */
    bindWithProvider(params: authModels.BindWithProviderRequest): Promise<void>
    /**
     * 查询用户（自定义登录场景和匿名登录场景，不支持使用该接口查询用户信息）
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv2/authentication#authqueryuser}
     *
     */
    queryUser(queryObj: authModels.QueryUserProfileRequest): Promise<authModels.QueryUserProfileResponse>
    /**
     * 获取当前登录用户的访问凭证
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv2/authentication#authgetaccesstoken}
     */
    getAccessToken(): Promise<{ accessToken: string; env: string }>
    /**
     * 提供第三方平台登录 token
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv2/authentication#authgrantprovidertoken}
     */
    grantProviderToken(params: authModels.GrantProviderTokenRequest): Promise<authModels.GrantProviderTokenResponse>
    patchProviderToken(params: authModels.PatchProviderTokenRequest): Promise<authModels.PatchProviderTokenResponse>
    /**
     * 第三方平台登录
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv2/authentication#authsigninwithprovider}
     */
    signInWithProvider(params: authModels.SignInWithProviderRequest): Promise<ILoginState>
    /**
     * 微信登录
     */
    signInWithWechat(params?: any): Promise<ILoginState>
    grantToken(params: authModels.GrantTokenRequest): Promise<ILoginState>
    /**
     * 生成第三方平台授权 Uri （如微信二维码扫码授权网页）
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv2/authentication#authgenproviderredirecturi}
     */
    genProviderRedirectUri(
      params: authModels.GenProviderRedirectUriRequest,
    ): Promise<authModels.GenProviderRedirectUriResponse>
    /**
     * 重置密码（用户忘记密码无法登录时，可使用该接口强制设置密码）
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv2/authentication#authresetpassword}
     */
    resetPassword(params: authModels.ResetPasswordRequest): Promise<void>
    deviceAuthorize(params: authModels.DeviceAuthorizeRequest): Promise<authModels.DeviceAuthorizeResponse>
    /**
     * 通过 sudo 接口获取高级操作权限，如修改用户密码，修改手机号，邮箱等操作
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv2/authentication#authsudo}
     */
    sudo(params: authModels.SudoRequest): Promise<authModels.SudoResponse>
    /**
     * 删除用户
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv2/authentication#authdeleteme}
     */
    deleteMe(params: authModels.WithSudoRequest): Promise<authModels.UserProfile>
    /**
     * 获取第三方绑定列表
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv2/authentication#authgetproviders}
     */
    getProviders(): Promise<authModels.UserProfileProvider>
    /**
     * 用于查询用户是否为匿名登录状态
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv2/authentication#authloginscope}
     */
    loginScope(): Promise<string>
    loginGroups(): Promise<string[]>
    onLoginStateChanged(callback: Function)
    createLoginState(params?: { version?: string; query?: any }, options?: { asyncRefreshUser?: boolean; userInfo?: any }): Promise<ILoginState>
    /**
     * 强制刷新token
     *
     * @param params
     */
    refreshTokenForce(params: { version?: string }): Promise<authModels.Credentials>
    /**
     * 获取身份信息
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv2/authentication#authgetcredentials}
     */
    getCredentials(): Promise<authModels.Credentials>
    /**
     * 写入身份信息
     *
     * @param credentials
     */
    setCredentials(credentials: authModels.Credentials): Promise<void>
    /**
     * 获取身份源类型
     *
     */
    getProviderSubType(): Promise<authModels.ProviderSubType>
    /**
     * 创建验证码数据
     *
     * @param params
     */
    createCaptchaData(params: { state: string; redirect_uri?: string }): Promise<any>
    /**
     * 验证验证码数据
     *
     * @param params
     */
    verifyCaptchaData(params: { token: string; key: string }): Promise<any>
    /**
     * 修改密码
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv2/authentication#authmodifypassword}
     *
     * @param params
     */
    modifyPassword(params: authModels.ModifyUserBasicInfoRequest): Promise<void>
    /**
     * 未登录状态修改密码
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv2/authentication#authmodifypasswordwithoutlogin}
     *
     * @param params
     */
    modifyPasswordWithoutLogin(params: authModels.ModifyPasswordWithoutLoginRequest): Promise<void>
    /**
     * 获取用户行为日志
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv2/authentication#authgetuserbehaviorlog}
     *
     * @param params
     */
    getUserBehaviorLog(params: authModels.GetUserBehaviorLog): Promise<authModels.GetUserBehaviorLogRes>
    /**
     * 检查用户名是否被绑定过
     *
     * {@link https://docs.cloudbase.net/api-reference/webv2/authentication.html#authisusernameregistered}
     *
     * @example
     * ```javascript
     * const app = cloudbase.init({
     *   env: "xxxx-yyy"
     * });
     * const auth = app.auth();
     * const username = "your_awesome_username";
     * auth.isUsernameRegistered(username).then(registered=>{
     *   // ...
     * });
     * ```
     *
     * @param username 用户名
     *
     * @return Promise-用户是否被绑定
     */
    isUsernameRegistered(username: string): Promise<boolean>
    getMiniProgramQrCode(params: authModels.GetMiniProgramQrCodeRequest): Promise<authModels.GetMiniProgramQrCodeResponse>
    getMiniProgramQrCodeStatus(
      params: authModels.GetMiniProgramQrCodeStatusRequest,
    ): Promise<authModels.GetMiniProgramQrCodeStatusResponse>
    /**
     * 跳转到默认登录页
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv2/authentication#authtodefaultloginpage}
     * @param params 
     */
    toDefaultLoginPage(params?: authModels.ToDefaultLoginPage): Promise<CommonRes>

    
    /**
     * 退出登录
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/authentication#signout}
     *
     * @example
     * ```javascript
     * const app = cloudbase.init({
     *   env: "xxxx-yyy"
     * });
     * app.auth.signOut().then(()=>{});
     * ```
     *
     * @return Promise
     */
    signOut(params?: authModels.SignoutRequest): Promise<void | authModels.SignoutReponse>
    /**
     * 使用自定义登录 ticket 登录
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv3/authentication#signinwithcustomticket}
     *
     * @param getTickFn
     */
    signInWithCustomTicket(getTickFn?: authModels.GetCustomSignTicketFn): Promise<ILoginState>
    /**
     * 用户登录，目前支持手机号，邮箱，用户名密码登录
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv3/authentication#signin}
     */
    signIn(params: authModels.SignInRequest): Promise<ILoginState>
    /**
     * 用户注册，目前支持手机号验证码注册，邮箱验证码注册
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv3/authentication#signup}
     */
    signUp(params: authModels.SignUpRequest): Promise<SignUpRes>
    /**
     * 监听认证状态变化
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv3/authentication#onauthstatechange}
     *
     * @param callback
     */
    onAuthStateChange(callback: OnAuthStateChangeCallback): { data: { subscription: { id: string; callback: Function; unsubscribe: () => void } } }
    /**
     * 使用用户名和密码登录
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv3/authentication#signinwithpassword}
     *
     * @param params
     */
    signInWithPassword(params: SignInWithPasswordReq): Promise<SignInRes>
    /**
     * 使用第三方平台 ID Token 登录
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv3/authentication#signinwithidtoken}
     *
     * @param params
     */
    signInWithIdToken(params: SignInWithIdTokenReq): Promise<SignInRes>
    /**
     * 使用一次性密码（OTP）登录
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv3/authentication#signinwithotp}
     *
     * @param params
     */
    signInWithOtp(params: SignInWithOtpReq): Promise<SignInWithOtpRes>
    /**
     * 校验第三方平台授权登录回调
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv3/authentication#verifyoauth}
     *
     * @param params
     */
    verifyOAuth(params?: VerifyOAuthReq): Promise<SignInRes>
    /**
     * 生成第三方平台授权 Uri
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv3/authentication#signinwithoauth}
     *
     * @param params
     */
    signInWithOAuth(params: SignInWithOAuthReq): Promise<SignInOAuthRes>
    /**
     * 获取当前访问令牌中的声明信息
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv3/authentication#getclaims}
     */
    getClaims(): Promise<GetClaimsRes>
    /**
     * 通过邮箱重置密码
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv3/authentication#resetpasswordforemail}
     *
     * @param emailOrPhone
     * @param options
     */
    resetPasswordForEmail(emailOrPhone: string, options?: { redirectTo?: string }): Promise<ResetPasswordForEmailRes>
    /**
     * 通过旧密码重置密码
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv3/authentication#resetpasswordforold}
     *
     * @param params
     */
    resetPasswordForOld(params: ResetPasswordForOldReq): Promise<SignInRes>
    /**
     * 验证一次性密码（OTP）
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv3/authentication#verifyotp}
     *
     * @param params
     */
    verifyOtp(params: VerifyOtpReq): Promise<SignInRes>
    /**
     * 获取当前会话
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv3/authentication#getsession}
     */
    getSession(): Promise<SignInRes>
    /**
     * 刷新会话
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv3/authentication#refreshsession}
     *
     * @param refresh_token
     */
    refreshSession(refresh_token?: string): Promise<SignInRes>
    /**
     * 获取当前用户详细信息
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv3/authentication#getuser}
     */
    getUser(): Promise<GetUserRes>
    /**
     * 刷新用户信息
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv3/authentication#refreshuser}
     */
    refreshUser(): Promise<CommonRes>
    /**
     * 更新用户信息
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv3/authentication#updateuser}
     *
     * @param params
     */
    updateUser(params: UpdateUserReq): Promise<GetUserRes | UpdateUserWithVerificationRes>
    /**
     * 获取已绑定的身份源
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv3/authentication#getuseridentities}
     */
    getUserIdentities(): Promise<GetUserIdentitiesRes>
    /**
     * 绑定身份源到当前用户
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv3/authentication#linkidentity}
     *
     * @param params
     */
    linkIdentity(params: LinkIdentityReq): Promise<LinkIdentityRes>
    /**
     * 解绑身份源
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv3/authentication#unlinkidentity}
     *
     * @param params
     */
    unlinkIdentity(params: UnlinkIdentityReq): Promise<CommonRes>
    /**
     * 重新认证
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv3/authentication#reauthenticate}
     */
    reauthenticate(): Promise<ReauthenticateRes>
    /**
     * 重新发送验证码
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv3/authentication#resend}
     *
     * @param params
     */
    resend(params: ResendReq): Promise<ResendRes>
    /**
     * 使用 access_token 和 refresh_token 设置会话
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv3/authentication#setsession}
     *
     * @param params
     */
    setSession(params: SetSessionReq): Promise<SignInRes>
    /**
     * 删除当前用户
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv3/authentication#deleteuser}
     *
     * @param params
     */
    deleteUser(params: DeleteMeReq): Promise<CommonRes>
    /**
     * 小程序 openId 静默登录
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv3/authentication#signinwithopenid}
     *
     * @param params
     */
    signInWithOpenId(params?: { useWxCloud?: boolean }): Promise<SignInRes>
    /**
     * 小程序手机号授权登录
     *
     * 文档 {@link https://docs.cloudbase.net/api-reference/webv3/authentication#signinwithphoneauth}
     *
     * @param params
     */
    signInWithPhoneAuth(params: { phoneCode: string }): Promise<SignInRes>
  }
}
/**
 * functions
 */
declare namespace cloudbase.functions {
  interface ICallFunctionOptions {
    name: string
    data?: KV<any>
    query?: KV<any>
    search?: string
    parse?: boolean
  }

  interface ICallFunctionResponse {
    requestId: string
    result: any
  }
}
/**
 * storage
 */
declare namespace cloudbase.storage {
  interface ICloudbaseUploadFileParams {
    cloudPath: string
    filePath?: string
    method?: 'post' | 'put'
    headers?: KV<string>
    onUploadProgress?: Function
    // 文件内容 Buffer 或 文件可读流, node端使用
    fileContent?: any
    customReqOpts?: ICustomReqOpts
  }
  interface ICloudbaseUploadFileResult {
    fileID: string
    requestId: string
  }
  interface ICloudbaseGetUploadMetadataParams {
    cloudPath: string
    customReqOpts?: ICustomReqOpts
  }
  interface ICloudbaseDeleteFileParams {
    fileList: string[]
    customReqOpts?: ICustomReqOpts
  }
  interface ICloudbaseDeleteFileResult {
    code?: string
    message?: string
    fileList?: {
      code?: string
      fileID: string
    }[]
    requestId?: string
  }

  interface ICloudbaseFileInfo {
    fileID: string
    maxAge: number
  }

  interface ICloudbaseGetTempFileURLParams {
    fileList: string[] | ICloudbaseFileInfo[]
    customReqOpts?: ICustomReqOpts
  }

  interface ICloudbaseGetTempFileURLResult {
    code?: string
    message?: string
    fileList?: {
      code?: string
      message?: string
      fileID: string
      tempFileURL: string
      download_url?: string
    }[]
    requestId?: string
  }
  interface ICloudbaseDownloadFileParams {
    fileID: string
    tempFilePath?: string
    customReqOpts?: ICustomReqOpts
  }
  interface ICloudbaseDownloadFileResult {
    code?: string
    message?: string
    fileContent?: any
    requestId?: string
  }
  interface ICloudbaseFileMetaData {
    url: string
    token: string
    authorization: string
    fileId: string
    cosFileId: string
    download_url: string
  }

  interface ICloudbaseFileMetaDataRes {
    data: ICloudbaseFileMetaData
    requestId: string
  }

  interface ICloudbaseCopyFileParams {
    fileList: Array<{
      srcPath: string
      dstPath: string
      overwrite?: boolean
      removeOriginal?: boolean
    }>
    customReqOpts?: ICustomReqOpts
  }

  interface ICloudbaseCopyFileResult {
    fileList: Array<{
      fileId?: string
      code?: string
      message?: string
    }>
    requestId?: string
  }
}

declare namespace cloudbase.database {
  /**
   * realtime types
   */
  interface IWatchOptions {
    // server realtime data init & change event
    onChange: (snapshot: ISnapshot) => void
    // error while connecting / listening
    onError: (error: any) => void
  }
  interface DBRealtimeListener {
    /**
     * 关闭实时推送
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database.html#shu-ju-ku-shi-shi-tui-song}
     *
     * @example
     * // 启动监听
     * const ref = db
     *   .collection("collName")
     *   .where({ test: _.gt(0) })
     *   .watch({
     *     onChange: (snapshot) => {
     *       console.log("收到snapshot**********", snapshot);
     *     },
     *     onError: (error) => {
     *       console.log("收到error**********", error);
     *     }
     *   });
     * // 关闭监听
     * ref.close();
     */
    close: () => void
  }
  type DataType = 'init' | 'update' | 'add' | 'remove' | 'replace' | 'limit'
  type QueueType = 'init' | 'enqueue' | 'dequeue' | 'update'
  interface ISnapshot {
    id: number
    docChanges: ISingleDBEvent[]
    docs: Record<string, any>
    type?: SnapshotType
  }

  interface ISingleDBEvent {
    id: number
    dataType: DataType
    queueType: QueueType
    docId: string
    doc: Record<string, any>
    updatedFields?: any
    removedFields?: any
  }

  type SnapshotType = 'init'

  interface IWatchable {
    /**
     * 开启实时推送
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database#%E6%95%B0%E6%8D%AE%E5%BA%93%E5%AE%9E%E6%97%B6%E6%8E%A8%E9%80%81}
     *
     * @example
     * const ref = db
     *   .collection("collName")
     *   .where({ test: _.gt(0) })
     *   .watch({
     *     onChange: (snapshot) => {
     *       console.log("收到snapshot**********", snapshot);
     *     },
     *     onError: (error) => {
     *       console.log("收到error**********", error);
     *     }
     *   });
     * @param options
     * @param options.onChange 监听数据变化的回调函数
     * @param options.onError 监听出现错误的回调函数
     *
     * @return 实时推送进程实例
     */
    watch(options: IWatchOptions): DBRealtimeListener
  }
  /**
   * collection types
   */
  interface ICollection extends IQuery {
    /**
     * 插入一条文档
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database#add}
     *
     * @param data 文档数据
     */
    add(data: Object): Promise<Pick<SetRes, 'code' | 'message'>>
    /**
     * 获取一条文档的引用
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database#record--document}
     *
     * @param id 文档ID
     */
    doc(id: string): IDocument
  }
  /**
   * command types
   */
  interface IGeoNearOptions {
    geometry: IGeo['Point'] // 点的地理位置
    maxDistance?: number // 选填，最大距离，米为单位
    minDistance?: number // 选填，最小距离，米为单位
  }
  interface IGeoWithinOptions {
    geometry: IPolygon | IMultiPolygon
  }
  interface IGeoIntersectsOptions {
    geometry: IPoint | ILineString | IMultiPoint | IMultiLineString | IPolygon | IMultiPolygon
  }
  interface ICommand {
    /**
     * 表示字段等于某个值
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database#eq}
     *
     * @example
     * const _ = db.command;
     * db.collection("demo").where({
     *   num: _.eq(10)
     * })
     *
     * @param val 接受一个字面量 (literal)，可以是 `number`, `boolean`, `string`, `object`, `array`
     *
     */
    eq(val: number | string | boolean | Object | any[]): any
    /**
     * 表示字段不等于某个值
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database#neq}
     *
     * @example
     * const _ = db.command;
     * db.collection("demo").where({
     *   num: _.neq(10)
     * })
     *
     * @param val 接受一个字面量 (literal)，可以是 `number`, `boolean`, `string`, `object`, `array`
     *
     */
    neq(val: number | string | boolean | Object | any[]): any
    /**
     * 字段大于指定值
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database#gt}
     *
     * @example
     * const _ = db.command;
     * db.collection("demo").where({
     *   num: _.gt(10)
     * })
     *
     * @param val 数字
     *
     */
    gt(val: number): any
    /**
     * 字段大于或等于指定值
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database#neq}
     *
     * @example
     * const _ = db.command;
     * db.collection("demo").where({
     *   num: _.gte(10)
     * })
     *
     * @param val 数字
     *
     */
    gte(val: number): any
    /**
     * 字段小于指定值
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database#lt}
     *
     * @example
     * const _ = db.command;
     * db.collection("demo").where({
     *   num: _.lt(10)
     * })
     *
     * @param val 数字
     *
     */
    lt(val: number): any
    /**
     * 字段小于或等于指定值
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database#lte}
     *
     * @example
     * const _ = db.command;
     * db.collection("demo").where({
     *   num: _.lte(10)
     * })
     *
     * @param val 数字
     *
     */
    lte(val: number): any
    /**
     * 字段值在给定的数组中
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database#in}
     *
     * @example
     * const _ = db.command;
     * db.collection("demo").where({
     *   num: _.in([1,2,3])
     * })
     *
     * @param list 数组
     *
     */
    in(list: any[]): any
    /**
     * 字段值不在给定的数组中
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database#nin}
     *
     * @example
     * const _ = db.command;
     * db.collection("demo").where({
     *   num: _.nin([1,2,3])
     * })
     *
     * @param list 数组
     *
     */
    nin(list: any[]): any
    /**
     * 表示需同时满足指定的两个或以上的条件
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database#and}
     *
     * @example
     * const _ = db.command;
     * db.collection("demo").where({
     *   num: _.and(_.gt(4), _.lt(32))
     * })
     *
     * @param args 多个条件
     *
     */
    and(...args: any[]): any
    /**
     * 表示需满足所有指定条件中的至少一个
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database#or}
     *
     * @example
     * const _ = db.command;
     * db.collection("demo").where({
     *   num: _.or(_.gt(4), _.lt(32))
     * })
     *
     * @param args 多个条件
     *
     */
    or(...args: any[]): any
    /**
     * 用于设定字段等于指定值
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database#set}
     *
     * @example
     * const _ = db.command;
     * db.collection("demo")
     *   .doc("doc-id")
     *   .update({
     *      data: {
     *        style: _.set({
     *          color: "red"
     *        })
     *      }
     *   });
     *
     * @param val 被设定的属性对象
     *
     */
    set(val: any): any
    /**
     * 用于指示字段自增某个值
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database#inc}
     *
     * @example
     * const _ = db.command;
     * db.collection("demo")
     *   .doc("doc-id")
     *   .update({
     *      count: {
     *       favorites: _.inc(1)
     *     }
     *   });
     *
     * @param val 自增的值
     *
     */
    inc(val: number): any
    /**
     * 用于指示字段自乘某个值
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database#mul}
     *
     * @example
     * const _ = db.command;
     * db.collection("demo")
     *   .doc("doc-id")
     *   .update({
     *      count: {
     *       favorites: _.mul(21)
     *     }
     *   });
     *
     * @param val 自乘的值
     *
     */
    mul(val: number): any
    /**
     * 用于表示删除某个字段
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database#remove}
     *
     * @example
     * const _ = db.command;
     * db.collection("demo")
     *   .doc("doc-id")
     *   .update({
     *      rating: _.remove()
     *   });
     *
     */
    remove(): any
    /**
     * 向数组尾部追加元素
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database#push}
     *
     * @example
     * const _ = db.command;
     * db.collection("demo")
     *   .doc("doc-id")
     *   .update({
     *      users: _.push(["aaa", "bbb"])
     *   });
     *
     * @param val 支持传入单个元素或数组
     */
    push(val: any): any
    /**
     * 删除数组尾部元素
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database#pop}
     *
     * @example
     * const _ = db.command;
     * db.collection("demo")
     *   .doc("doc-id")
     *   .update({
     *      users: _.pop()
     *   });
     *
     */
    pop(): any
    /**
     * 向数组头部添加元素
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database#unshift}
     *
     * @example
     * const _ = db.command;
     * db.collection("demo")
     *   .doc("doc-id")
     *   .update({
     *      users: _.unshift(["aaa", "bbb"])
     *   });
     *
     * @param val 支持传入单个元素或数组
     */
    unshift(val: any): any
    /**
     * 删除数组头部元素
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database#shift}
     *
     * @example
     * const _ = db.command;
     * db.collection("demo")
     *   .doc("doc-id")
     *   .update({
     *      users: _.unshift()
     *   });
     *
     */
    shift(): any
    /**
     * 按从近到远的顺序，找出字段值在给定点的附近的文档
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database#geonear}
     *
     * @example
     * const _ = db.command;
     * db.collection("demo").where({
     *   location: _.geoNear({
     *     geometry: new db.Geo.Point(lngA, latA),
     *     maxDistance: 1000,
     *     minDistance: 0
     *   })
     * });
     *
     * @param options
     * @param options.geometry 点的地理位置
     * @param options.maxDistance 【可选】最大距离，米为单位
     * @param options.minDistance 【可选】最小距离，米为单位
     */
    geoNear(options: IGeoNearOptions): any
    /**
     * 找出字段值在指定 Polygon / MultiPolygon 内的文档，无排序
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database#geowithin}
     *
     * @example
     * const _ = db.command;
     * db.collection("demo").where({
     *   location: _.geoWithin({
     *     geometry: new Polygon({
     *       new LineString([...Points])
     *     }),
     *   })
     * });
     *
     * @param options
     * @param options.geometry 地理位置
     */
    geoWithin(options: IGeoWithinOptions): any
    /**
     * 找出字段值和给定的地理位置图形相交的文档
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database#geointersects}
     *
     * @example
     * const _ = db.command;
     * db.collection("user").where({
     *   location: _.geoNear({
     *     geometry: new LineString([new Point(lngA, latA), new Point(lngB, latB)]);
     *   })
     * });
     *
     * @param options
     * @param options.geometry 地理位置
     */
    geoIntersects(options: IGeoIntersectsOptions): any
  }
  /**
   * document types
   */
  interface IDocument extends IWatchable {
    /**
     * 更新文档，如果要更新的文档不存在时新增一个文档
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database.html#update-set}
     *
     * @example
     * collection
     *   .doc('docId')
     *   .set({name:'cloudbase'})
     *   .then(res=>{})
     *
     * @param data 文档数据
     *
     * @return Promise
     */
    set(data: Object): Promise<SetRes>
    /**
     * 获取查询结果
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database#get}
     *
     * @example
     * collection
     *   .doc('docId')
     *   .get()
     *   .then(res=>{})
     *
     * @return Promise-查询结果
     */
    get(): Promise<GetRes>
    /**
     * 更新文档，如果要更新的文档不存在什么也不会做
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database#update--set}
     *
     * @example
     * collection
     *   .doc('docId')
     *   .update({name:'cloudbase'})
     *   .then(res=>{})
     *
     * @param data 文档数据
     *
     * @return Promise
     */
    update(data: Object): Promise<SetRes>
    /**
     * 删除一条文档
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database.html#remove-2}
     *
     * @example
     * collection
     *   .doc('docId')
     *   .remove()
     *   .then(res=>{})
     *
     * @return Promise
     */
    remove(): Promise<any>
  }
  /**
   * query types
   */
  interface SetRes {
    code?: string
    message?: string
    updated?: number
    upsertedId?: number
    requestId: string
  }
  interface GetRes {
    data: any[]
    requestId: string
    code?: string
    message?: string
  }

  interface UpdateRes {
    requestId: string
    updated?: number
    upsertId?: string
    code?: string
    message?: string
  }

  interface QueryOrder {
    field?: string
    direction?: 'asc' | 'desc'
  }

  interface QueryOption {
    // 查询数量
    limit?: number
    // 偏移量
    offset?: number
    // 指定显示或者不显示哪些字段
    projection?: Object
  }
  interface IQuery extends IWatchable {
    /**
     * 获取数据库查询结果
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database.html#get}
     *
     * @example
     * collection
     *   .where({
     *     name: 'cloudbase'
     *   })
     *   .get()
     *   .then(res=>{})
     *
     * @return Promise-查询结果
     */
    get(): Promise<GetRes>
    /**
     * 更新数据库文档
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database.html#update-set}
     *
     * @example
     * collection
     *   .where({
     *     name: 'cloudbase'
     *   })
     *   .update({
     *      name: 'newCloudbase'
     *    })
     *   .then(res=>{})
     *
     * @return Promise-查询结果
     */
    update(data: Object): Promise<UpdateRes>
    /**
     * 获取数据库查询结果的数目
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database#count}
     *
     * @example
     * collection
     *   .where({
     *     name: 'cloudbase'
     *   })
     *   .count()
     *   .then(res=>{})
     *
     * @return Promise-查询结果
     */
    count(): Promise<any>
    /**
     * 设置过滤条件
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database#where}
     *
     * @example
     * collection
     *   .where({
     *     name: 'cloudbase'
     *   })
     *
     * @param query 可接收对象作为参数，表示筛选出拥有和传入对象相同的 key-value 的文档
     *
     */
    where(query: Object): ExcludeOf<IQuery, 'where'>
    /**
     * 指定查询结果集数量上限
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database#limit}
     *
     * @example
     * collection
     *   .where({
     *     name: 'cloudbase'
     *   })
     *   .limit(1)
     *
     * @param limit 查询结果数量上限
     */
    limit(limit: number): ExcludeOf<IQuery, 'where'>
    /**
     * 指定查询返回结果时从指定序列后的结果开始返回，常用于分页
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database#skip}
     *
     * @example
     * collection
     *   .where({
     *     name: 'cloudbase'
     *   })
     *   .skip(4)
     *
     * @param offset 跳过的条目数量
     */
    skip(offset: number): ExcludeOf<IQuery, 'where'>
    /**
     * 指定查询排序条件
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database#orderby}
     *
     * @example
     * collection
     *   .where({
     *     name: 'cloudbase'
     *   })
     *   .orderBy("name", "asc")
     *
     * @param field 排序的字段
     * @param orderType 排序的顺序，升序(asc) 或 降序(desc)
     */
    orderBy(field: string, orderType: 'desc' | 'asc'): ExcludeOf<IQuery, 'where'>
    /**
     * 指定返回结果中文档需返回的字段
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database#field}
     *
     * @example
     * collection
     *   .where({
     *     name: 'cloudbase'
     *   })
     *   .field({ age: true })
     *
     * @param projection 要过滤的字段集合，不返回传 false，返回传 true
     */
    field(projection: Object): ExcludeOf<IQuery, 'where'>
    /**
     * 删除查询到的结果
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database#remove-1}
     *
     * @example
     * collection
     *   .where({
     *     name: 'cloudbase'
     *   })
     *   .remove()
     *
     * @return Promise
     */
    remove(): Promise<any>
  }
  /**
   * geo types
   */
  interface IPoint {}
  interface ILineString {}
  interface IPolygon {}
  interface IMultiPoint {}
  interface IMultiLineString {}
  interface IMultiPolygon {}
  interface IGeo {
    /**
     * 用于表示地理位置点
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database#point}
     *
     * @example
     * const point = new db.Geo.Point(lng,lat);
     *
     * @param longitude 经度
     * @param latitude 纬度
     *
     * @return Point
     */
    Point: {
      new (longitude: number, latitude: number): IPoint
    }
    /**
     * 用于表示地理路径，是由两个或者更多的 Point 组成的线段
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database#linestring}
     *
     * @example
     * const point = new db.Geo.LineString([pointA,pointB]);
     *
     * @param points Point数组
     *
     * @return LineString
     */
    LineString: {
      new (points: IPoint[]): ILineString
    }
    /**
     * 用于表示地理上的一个多边形
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database#polygon}
     *
     * @example
     * const point = new db.Geo.Polygon([lineStringA,lineStringB]);
     *
     * @param lines LineString数组
     *
     * @return Polygon
     */
    Polygon: {
      new (lines: ILineString[]): IPolygon
    }
    /**
     * 用于表示多个点 Point 的集合
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database#multipoint}
     *
     * @example
     * const point = new db.Geo.MultiPoint([pointA,pointB]);
     *
     * @param points Point数组
     *
     * @return MultiPoint
     */
    MultiPoint: {
      new (points: IPoint[]): IMultiPoint
    }
    /**
     * 用于表示多个地理路径 LineString 的集合
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database#multilinestring}
     *
     * @example
     * const point = new db.Geo.MultiLineString([lineA,lineB]);
     *
     * @param lines LineString数组
     *
     * @return MultiLineString
     */
    MultiLineString: {
      new (lines: ILineString[]): IMultiLineString
    }
    /**
     * 用于表示多个地理多边形 Polygon 的集合
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database#multipolygon}
     *
     * @example
     * const point = new db.Geo.MultiPolygon([polygonA,polygonB]);
     *
     * @param polygons Polygon数组
     *
     * @return MultiPolygon
     */
    MultiPolygon: {
      new (polygons: IPolygon[]): IMultiPolygon
    }
  }
  /**
   * regexp types
   */
  interface IRegExpOptions {
    regexp: string
    options?: string
  }
  interface IRegExp {
    (options: IRegExpOptions): any
  }
  /**
   * instance types
   */
  interface App {
    /**
     * 数据库指令
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database#%E6%9F%A5%E8%AF%A2%E6%8C%87%E4%BB%A4}
     */
    command: ICommand
    /**
     * 数据库Geo地理位置
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database.html#geo-shu-ju-lei-xing}
     */
    Geo: IGeo
    /**
     * 根据正则表达式进行筛选
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database.html#regexp}
     *
     * @example
     * db.collection('articles').where({
     *   version: new db.RegExp({
     *     regexp: '^\\ds'   // 正则表达式为 /^\ds/，转义后变成 '^\\ds'
     *     options: 'i'    // i表示忽略大小写
     *   })
     * })
     *
     * @param options
     * @param options.regexp 正则表达式Pattern
     * @param options.options 正则表达式Flags
     */
    RegExp: IRegExp
    /**
     * 创建集合的引用
     *
     * {@link https://docs.cloudbase.net/api-reference/webv3/database.html#collection}
     *
     * @example
     * const coll = db.collection('demo');
     *
     * @param name 集合名称
     *
     * @return 集合的引用
     */
    collection(name: string): ICollection
  }
}

export default cloudbase
export as namespace cloudbase
