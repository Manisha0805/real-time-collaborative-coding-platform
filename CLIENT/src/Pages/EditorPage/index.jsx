import EditorLogic from "./EditorLogic";
import EditorLayout from "./EditorLayout";

function EditorPage() {
  const props = EditorLogic();

  return <EditorLayout {...props} />;
}

export default EditorPage;