import { useParams } from "react-router-dom";

export default function Classroom() {
    const { id } = useParams();

    return (
        <div className="p-6">
            <h1 className="text-2xl">Classroom {id}</h1>
            <p>This is where the document manager, chat, flashcards, etc. will go.</p>
        </div>
    );
}
