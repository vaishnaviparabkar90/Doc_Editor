import { useCallback, useEffect, useState } from "react"
import Quill from "quill"
import "quill/dist/quill.snow.css"
import { io } from "socket.io-client"
import { useParams } from "react-router-dom"
import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph } from "docx";

const SAVE_INTERVAL_MS = 2000
const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ font: [] }],
  [{ list: "ordered" }, { list: "bullet" }],
  ["bold", "italic", "underline"],
  [{ color: [] }, { background: [] }],
  [{ script: "sub" }, { script: "super" }],
  [{ align: [] }],
  ["image", "blockquote", "code-block"],
  ["clean"],
  [ "download-docx"],
]

export default function TextEditor() {
  const { id: documentId } = useParams()
  const [socket, setSocket] = useState()
  const [quill, setQuill] = useState()

  useEffect(() => {
    const s = io("http://localhost:3001")
    setSocket(s)

    return () => {
      s.disconnect()
    }
  }, [])

  useEffect(() => {
    if (socket == null || quill == null) return

    socket.once("load-document", document => {
      quill.setContents(document)
      quill.enable()
    })

    socket.emit("get-document", documentId)
  }, [socket, quill, documentId])

  useEffect(() => {
    if (socket == null || quill == null) return

    const interval = setInterval(() => {
      socket.emit("save-document", quill.getContents())
    }, SAVE_INTERVAL_MS)

    return () => {
      clearInterval(interval)
    }
  }, [socket, quill])

  useEffect(() => {
    if (socket == null || quill == null) return

    const handler = delta => {
      quill.updateContents(delta)
    }
    socket.on("receive-changes", handler)

    return () => {
      socket.off("receive-changes", handler)
    }
  }, [socket, quill])

  useEffect(() => {
    if (socket == null || quill == null) return

    const handler = (delta, oldDelta, source) => {
      if (source !== "user") return
      socket.emit("send-changes", delta)
    }
    quill.on("text-change", handler)

    return () => {
      quill.off("text-change", handler)
    }
  }, [socket, quill])



const wrapperRef = useCallback((wrapper) => {
  if (wrapper == null) return;

  wrapper.innerHTML = "";
  const editor = document.createElement("div");
  wrapper.append(editor);

  const q = new Quill(editor, {
    theme: "snow",
    modules: {
      toolbar: {
        container: TOOLBAR_OPTIONS,
        handlers: {
          "download-docx": function () {
            const text = q.getText();
            const docxFile = new Document({
              sections: [
                {
                  properties: {},
                  children: [new Paragraph(text)],
                },
              ],
            });
            Packer.toBlob(docxFile).then((blob) => {
              const link = document.createElement("a");
              link.href = URL.createObjectURL(blob);
              link.download = "document.docx";
              link.click();
            });
          },
        },
      },
    },
  });

  // Customize button icons
  const toolbar = q.getModule("toolbar");
  const docxBtn = toolbar.container.querySelector(".ql-download-docx");
  if (docxBtn) {
docxBtn.innerHTML = '<Button style="font-weight: bold;">Download_Me</Button>';

    docxBtn.title = "Download as Word";
  }

  q.disable();
  q.setText("Loading...");
  setQuill(q);
}, []);
  
  
  return <div className="container" ref={wrapperRef}></div>


}