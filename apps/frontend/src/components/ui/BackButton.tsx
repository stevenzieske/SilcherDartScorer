import { useNavigate } from 'react-router-dom'

interface Props {
    to?: string
    label: string
}

export default function BackButton({ to, label }: Props) {
    const navigate = useNavigate()
    return (
        <button
            onClick={() => to ? navigate(to) : navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 px-3 py-1.5 rounded-xl transition-colors">
            ← {label}
        </button>
    )
}
