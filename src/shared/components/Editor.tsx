"use client";

import { ChangeEventHandler, CSSProperties, useCallback, useEffect, useState } from "react";
import { TabBox } from "./TabBox";  


enum BlockType {
    Text, Separator
}

class BlockData {
    type: BlockType;
    data: string;
    constructor(type: BlockType) {
        this.type = type;
        this.data = "";
    }
}

class Document {
    id: string;
    blocks: BlockData[];
    focus: number;
    constructor(id: string) {
        this.id = id;
        this.blocks = [new BlockData(BlockType.Text)];
        this.focus = 0;
    }
    insertBlock = (block: BlockData, index: number) => {
        this.blocks = [...this.blocks.slice(0, index), block, ...this.blocks.slice(index, this.blocks.length)];
    }
}

function Block({
    className, style,
    id, index, datas, fnAddBlock, fnChangeFocus
} : {
    className?: string | undefined, style?: CSSProperties | undefined
    id: string, index: number, datas: BlockData[], fnAddBlock: (index: number) => void, fnChangeFocus: (delta: number) => void
}) {
    
    
    
    if (datas[index].type == BlockType.Separator)
        return <hr className="mt-[4px] mb-[3px] border-y-1" />
        // return <div className="mt-[14px] mb-[15px] h-[10px] bg-slate-500"></div>














    function fixHeight(textarea: HTMLTextAreaElement) {
        // textarea.style.height = 'auto';
        // let height = textarea.scrollHeight; // 높이
        // textarea.style.height = `${height}px`;
        var height = `${textarea.value.split("\n").length*24+6}px`;
        var block = document.getElementById(`Block-${id}-${index}`) as HTMLTextAreaElement | null;
        if (block) block.style.height = height;
        textarea.style.height = height;
    }
    function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
        if (event.key == "Enter" && !event.shiftKey) { fnAddBlock(index+1); event.preventDefault() }
        var textarea = document.getElementById(`Input-${id}-${index}`) as HTMLTextAreaElement | null;
        var selectionStart = textarea?.selectionStart ?? -1;
        var selectionEnd = textarea?.selectionEnd ?? -1;
        var firstLineEnd = textarea?.value.indexOf("\n") ?? -1;
        var lastLineStart = textarea?.value.lastIndexOf("\n") ?? -1;
        if ((firstLineEnd  == -1 || selectionStart <= firstLineEnd) && event.key == "ArrowUp"  ) fnChangeFocus(-1);
        if ((lastLineStart == -1 || selectionEnd   > lastLineStart) && event.key == "ArrowDown") fnChangeFocus( 1);
        if (selectionStart == 0 && event.key == "ArrowLeft") fnChangeFocus(-1);
        if (selectionEnd == (textarea?.value.length ?? -1) && event.key == "ArrowRight") fnChangeFocus(1);
    }
    var [text, setText] = useState("");
    function executeText(text: string) {
        datas[index].data = text
        setText(datas[index].data)
        if (text == "---") {
            datas[index].type = BlockType.Separator
            datas[index].data = "";
            fnChangeFocus(1);
        }
    }
    useEffect(() => {
        setText(datas[index].data)
        setTimeout(() => fixHeight(document.getElementById(`Input-${id}-${index}`)), 5)
    }, [index, datas])
    var onChange: ChangeEventHandler<HTMLTextAreaElement> = useCallback(event => executeText(event.target.value), [index, datas]);
    return <div id={`Block-${id}-${index}`} className={className} style={style} onKeyDown={onKeyDown}>
        <textarea 
                id={`Input-${id}-${index}`} className={"placeholder:text-white focus:placeholder:text-gray-400 overflow-hidden resize-none outline-none"} style={{height:"30px", width:"100%", border:0}} 
                value={text} onChange={onChange} placeholder={"Write down somthing surprising!"}
                onInput={e => fixHeight(e.target)}/>
    </div>
}


export default function Editor({className, style}: {className?: string | undefined, style?: CSSProperties | undefined}) {
    var documentData = new Document("haru");

    var [toolNumber, setToolNumber] = useState(-1);
    var [docmuentBlocks, setDocumentBlocks] = useState(documentData.blocks);
    var [docmuentFocus, setDocumentFocus] = useState(documentData.focus);

    function saveDocument() {
        documentData.blocks = docmuentBlocks;
        documentData.focus = docmuentFocus;
    }

    function fnAddBlock(index: number) {
        var data: BlockData = new BlockData(BlockType.Text);
        setDocumentBlocks([...docmuentBlocks.slice(0, index), data, ...docmuentBlocks.slice(index, docmuentBlocks.length)])
        setDocumentFocus(index);
    }

    useEffect(
        () => {
            function focus() {
                var element = document.getElementById(`Input-${documentData.id}-${docmuentFocus}`);
                if (element) element.focus();
                else setTimeout(focus, 10);
            }
            setTimeout(focus, 10);
        }, [docmuentFocus]
    )

    return <div className={"flex flex-col overflow-hidden " + className} style={style}>
        <TabBox select={toolNumber} onSelect={setToolNumber} tabnames={["File", "Edit"]}>
            <div>FileMenu</div>
            <div>EditMenu</div>
        </TabBox>
        
        <div className="flex flex-col flex-auto items-center overflow-y-auto h-full bg-slate-100 bluescroll">
            <div className="flex flex-col bg-white min-h-full" style={{width:"70%"}}>
                {docmuentBlocks.map((block, index) => (
                                <Block
                                    key={"block-"+documentData.id+"-"+index}

                                    className="m-0 grow-0"

                                    id={documentData.id}
                                    index={index}
                                    datas={docmuentBlocks}
                                    fnAddBlock={fnAddBlock}
                                    fnChangeFocus={delta => setDocumentFocus(docmuentFocus+delta)}
                                    
                                />
                            ))}
            </div>
        </div>
        {/* <button onClick={() => {saveDocument(); console.log(documentData.blocks)}}>Print</button> */}
    </div>
}