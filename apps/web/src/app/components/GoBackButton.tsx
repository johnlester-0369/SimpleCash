import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Button from '@/app/components/ui/buttons/Button'

/**
 * Shared "go back" action for error/404 screens. Uses history.back() via
 * useNavigate(-1) rather than a hardcoded route so it works correctly
 * regardless of which page the user landed on before the crash/404.
 */
export default function GoBackButton() {
  const navigate = useNavigate()

  return (
    <Button
      variant="text"
      leftIcon={<ArrowLeft className="h-4 w-4" />}
      onClick={() => navigate(-1)}
    >
      Go back
    </Button>
  )
}
