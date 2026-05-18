import { useNavigate } from 'react-router-dom'

export default function HomeButton() {
    const navigate = useNavigate()
    return (
        <button onClick={() => navigate('/')}
            className="text-gray-500 hover:text-white text-sm transition-colors">
            ← Role selection
        </button>
    )
}
