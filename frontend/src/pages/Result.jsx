import { useParams } from 'react-router-dom'

function Result() {
    const { imageId } = useParams()
    return (
        <h1 className="text-2xl font-bold text-teal-700">
            Result for image {imageId}
            </h1>
    )
}

export default Result