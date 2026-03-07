"use client"

import * as React from "react"
import { getAIModel, saveAIModel } from "@/app/dashboard/ai/actions"

interface UseAIModelResult {
    selectedModel: string
    setSelectedModel: (model: string) => void
    models: string[]
    isLoading: boolean
}

export function useAIModel(): UseAIModelResult {
    const [selectedModel, setSelectedModelState] = React.useState<string>('')
    const [models, setModels] = React.useState<string[]>([])
    const [isLoading, setIsLoading] = React.useState(true)

    React.useEffect(() => {
        let cancelled = false

        const init = async () => {
            const [savedModel, modelsRes] = await Promise.all([
                getAIModel().catch(() => null),
                fetch('/api/ai/models')
                    .then(r => r.json())
                    .then((d: { models?: { name: string }[] }) =>
                        d.models?.map(m => m.name) ?? []
                    )
                    .catch(() => [] as string[]),
            ])

            if (cancelled) return

            setModels(modelsRes)

            if (savedModel && modelsRes.includes(savedModel)) {
                setSelectedModelState(savedModel)
            } else if (modelsRes.includes('kimi-k2.5:cloud')) {
                setSelectedModelState('kimi-k2.5:cloud')
            } else if (modelsRes.length > 0) {
                setSelectedModelState(modelsRes[0])
            }

            setIsLoading(false)
        }

        init()
        return () => { cancelled = true }
    }, [])

    const setSelectedModel = React.useCallback((model: string) => {
        setSelectedModelState(model)
        saveAIModel(model).catch(err => console.error('Failed to save AI model:', err))
    }, [])

    return { selectedModel, setSelectedModel, models, isLoading }
}
