import type { Ref } from 'vue';
import { ref } from 'vue';
import { isEqual } from 'lodash-es';


import { type PaginationProps, useAntPagination } from '../antPagination';
import { PagedList, ResponseData } from '../types';

/**
 * 分页查询hook
 * @param api 请求分页数据api
 * @param initParams 初始化参数,每次请求都会携带
 * @param antPaginationProps ant分页组件props
 * @returns { loading, initParams, searchParams, dataSource, search, addLoad, refresh, pagination }
 */
export const usePaged = <T>(
	api: (params: Record<string, any>) => Promise<ResponseData<PagedList<T>>>,
	initParams?: object,
	antPaginationProps?: PaginationProps
) => {
	const loading = ref(false);
	const dataSource = ref<T[]>([]) as Ref<T[]>;
	let catchSearchParams: object | null | undefined;

	const getTabelData = async (searchParams?: object | null, isAdd?: boolean) => {
		try {
			loading.value = true;
			const result = await api({
				...initParams,
				...(searchParams ?? catchSearchParams),
				current: pagination.current,
				size: pagination.pageSize,
			});
			const { list, total }: { list: T[]; total: number } = result.data;
			pagination.total = total;
			if (isAdd) {
				dataSource.value.push(...(list || []));
			} else {
				dataSource.value = list || [];
			}

			loading.value = false;
		} catch (error) {
			loading.value = false;
			console.warn('获取列表数据错误', error);
		}
	};
	/**
	 * 手动调用查询函数
	 * @param searchParams 查询条件,不包含初始化时得查询条件
	 */
	const search = async (searchParams?: object) => {
		// 如果条件发生变化，则自动返回第一页
		if (!isEqual(catchSearchParams, searchParams)) {
			catchSearchParams = searchParams;
			pagination.current = 1;
		}
		await getTabelData(searchParams);
	};
	/**
	 * 刷新数据
	 */
	const refresh = () => {
		getTabelData();
	};
	/**
	 * 加载更多,如果不是一直加载可以不用这个函数
	 * 这里第一次或每次参数放生变动都需要调用search方法将searchParams改变
	 */
	const addLoad = async () => {
		pagination.current = (pagination.current || 0) + 1;
		getTabelData(null, true);
	};

	const { pagination } = useAntPagination(getTabelData, antPaginationProps);

	return {
		loading,
		// 一下两个属性要不要返回,另外要不要组合到一块
		// initParams,
		// searchParams: catchSearchParams,
		dataSource,
		search,
		addLoad,
		refresh,
		pagination,
	};
};
