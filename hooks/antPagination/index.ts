import { reactive } from 'vue';
import type { PaginationProps } from 'ant-design-vue';

export { PaginationProps };
/**
 *
 * @param changeCb 页码或 pageSize 改变的回调，参数是改变后的页码及每页条数
 * @param pageProps ant pagination配置
 * @returns { pagination }
 */
export const useAntPagination = (changeCb: Function, pageProps?: PaginationProps) => {
	const onChange = (page: number, size: number) => {
		pagination.current = page;
		pagination.pageSize = size;
		changeCb();
	};

	const pagination = reactive<PaginationProps>({
		current: 1,
		pageSize: pageProps?.pageSizeOptions ? +pageProps.pageSizeOptions[0] : 10,
		total: 0,
		pageSizeOptions: ['10', '30', '60', '90'],
		showSizeChanger: true,
		showQuickJumper: true,
		onChange,
		showTotal: (total: number) =>  `共 ${total} 条数据`,
		...pageProps,
	});
	return {
		pagination,
	};
};
