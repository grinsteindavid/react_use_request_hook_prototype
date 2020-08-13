
// CAMPAING API INTERFACE // interface.js

import { useEffect } from "react";

function mapDataHelper(data) {
    return { ...data, newAttr: Math.random() }
}

export function updateCampaign(campaign) {
    return {
        config: {
            method: 'POST',
            baseURL: `${BASE_URL}/campaigns/${campaign._id}`,
            data: JSON.stringify(campaign)
        },
        interceptors: {
            request: [function (request) {
                // Do something before request is sent
                return request;
            }, function (error) {
                // Do something with request error
                return Promise.reject(error);
            }],
            response: [function (response) {
                // Any status code that lie within the range of 2xx cause this function to trigger
                // Do something with response data
                return mapDataHelper(response.data);
            }, function (error) {
                // Any status codes that falls outside the range of 2xx cause this function to trigger
                // Do something with response error
                return Promise.reject(error);
            }]
        }
    }
}


// REACT HOOK // use_request.js

export function useRequest() {
    const [status, setStatus] = useState(undefined)
    const [data, setData] = useState(undefined)
    const [error, setError] = useState(undefined)
    const { openAuthModal, userToken } = useAdmin()
    const cancelToken = useRef()
    const lastRequestConfig = useRef()

    function cancelRequest(message = 'operation canceled by the user') {
        if (cancelToken.current) {
            cancelToken.current.cancel(message)
        }
    }

    async function request({ config, interceptors }) {
        lastRequestConfig.current = { config, interceptors }
        cancelToken.current = Axios.CancelToken.source()
        const axiosInstance = Axios.create({ cancelToken })
        axiosInstance.interceptors.request.use(...interceptors.request)
        axiosInstance.interceptors.response.use(...interceptors.response)

        setError(undefined)
        setStatus('loading')
        try {
            const response = await axiosInstance.request({
                timeout: 10000,
                ...config,
                params: { ...config.params, 'token': TOKEN },
                headers: { ...config.headers, 'Authorization': `Bearer ${Store.get('token')}` }
            })
            setData(response.data)
            setStatus('finished')
        } catch (error) {
            console.error(error)
            if (axiosInstance.isCancel(error)) {
                setStatus('canceled')
            } else {
                setStatus('failed')
            }

            if (error.response.status === 401) {
                openAuthModal()
            }
            setError(error)
        }
    }

    useEffect(() => {
        return function cleanup() {
            if (cancelToken.current) {
                cancelRequest('component dismount')
            }
        }
    }, [])

    useEffect(() => {
        if (userToken && error.response.status === 401) {
            request(lastRequestConfig.current)
        }
    }, [userToken])

    return { request, status, data, error, cancelRequest }
}

// REACT COMPONENT // component.jsx

export function CampaignForm(props) {
    const [campaign, setCampaign] = useState({ name: '' })
    const { request: updateCampaignData, status: campaignStatus, data: campaignData } = useRequest()

    async function formHandler(e) {
        e.preventDefault()
        await updateCampaignData(updateCampaign(campaign))
        setCampaign(campaignData)
    }

    return useMemo(() => {
        return (
            <form onSubmit={formHandler} loading={campaignStatus === 'loading'}>
                <input value={campaign.name} onChange={e => setCampaign(prevState => ({ ...prevState, name: e.target.value }))} />

                <button type="submit" />
            </form>
        )
    }, [campaing, campaignStatus])
}



