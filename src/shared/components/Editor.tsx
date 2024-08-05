"use client";

import React, { ChangeEventHandler, CSSProperties, useCallback, useEffect, useState } from "react";
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
type FocusData = {
    index: number, 
    selection: number
}
class Document {
    id: string;
    blocks: BlockData[];
    focus: FocusData;
    constructor(id: string) {
        this.id = id;
        this.blocks = [new BlockData(BlockType.Text)];
        this.focus = {index:0, selection:0};
    }
    insertBlock = (block: BlockData, index: number) => {
        this.blocks = [...this.blocks.slice(0, index), block, ...this.blocks.slice(index, this.blocks.length)];
    }
}


function Block({
    className, style,
    id, index, data,
    fnAddBlock, fnSetFocus
} : {
    className?: string | undefined, style?: CSSProperties | undefined
    id: string, index: number, data: BlockData
    fnAddBlock: (index: number) => void, fnSetFocus: (value: FocusData) => void
}) {
    
    
    if (data.type == BlockType.Separator)
        return <hr className="mt-[4px] mb-[3px] border-y-1" />
        // return <div className="mt-[14px] mb-[15px] h-[10px] bg-slate-500"></div>














    function fixHeight(textarea: HTMLTextAreaElement) {
        // textarea.style.height = 'auto';
        // let height = textarea.scrollHeight; // 높이
        // textarea.style.height = `${height}px`;
        var height = `${textarea.value.split("\n").length*24+6}px`;
        var block = window.document.getElementById(`Block-${id}-${index}`) as HTMLTextAreaElement | null;
        if (block) block.style.height = height;
        textarea.style.height = height;
    }
    function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
        if (event.key == "Enter" && !event.shiftKey) { fnAddBlock(index+1); event.preventDefault(); return; }
        var textarea = window.document.getElementById(`Input-${id}-${index}`) as HTMLTextAreaElement | null;
        var selectionStart = textarea?.selectionStart ?? -1;
        var selectionEnd = textarea?.selectionEnd ?? -1;
        var firstLineEnd = textarea?.value.indexOf("\n") ?? -1;
        var lastLineStart = textarea?.value.lastIndexOf("\n") ?? -1;
        if ((firstLineEnd  == -1 || selectionStart <= firstLineEnd) && event.key == "ArrowUp"  ) { fnSetFocus({index:index-1, selection:selectionStart}); event.preventDefault(); return; };
        if ((lastLineStart == -1 || selectionEnd   > lastLineStart) && event.key == "ArrowDown") { fnSetFocus({index:index+1, selection:selectionStart}); event.preventDefault(); return; };
        if (selectionStart == 0 && event.key == "ArrowLeft") { fnSetFocus({index:index-1, selection:selectionStart}); event.preventDefault(); return; };
        if (selectionEnd == (textarea?.value.length ?? -1) && event.key == "ArrowRight") { fnSetFocus({index:index+1, selection:selectionStart}); event.preventDefault(); return; };
    }
    function onKeyUp(event: React.KeyboardEvent<HTMLDivElement>) {
        var textarea = window.document.getElementById(`Input-${id}-${index}`) as HTMLTextAreaElement | null;
        var selectionStart = textarea?.selectionStart ?? -1;
        fnSetFocus({index:index, selection:selectionStart})
    }
    var [text, setText] = useState("");
    function executeText(text: string) {
        data.data = text
        setText(data.data)
        if (text == "---") {
            data.type = BlockType.Separator
            data.data = "";
            fnSetFocus({index:index+1, selection:0});
        }
    }
    useEffect(() => {
        setText(data.data)
        setTimeout(() => {
            var target = window.document.getElementById(`Input-${id}-${index}`);
            if (target) fixHeight(target as HTMLTextAreaElement);
        }, 5)
    }, [index, data])
    var onChange: ChangeEventHandler<HTMLTextAreaElement> = useCallback(event => executeText(event.target.value), [index, data]);
    return <div id={`Block-${id}-${index}`} className={className} style={style} onKeyDown={onKeyDown} onKeyUp={onKeyUp}>
        <textarea 
                id={`Input-${id}-${index}`} className={"placeholder:text-white focus:placeholder:text-gray-400 overflow-hidden resize-none outline-none"} style={{height:"30px", width:"100%", border:0}} 
                value={text} onChange={onChange} placeholder={"Write down somthing surprising!"}
                onInput={() => {
                    var target = window.document.getElementById(`Input-${id}-${index}`);
                    if (target) fixHeight(target as HTMLTextAreaElement);
                }}/>
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
    useEffect(
        saveDocument,
        [docmuentBlocks, docmuentFocus]
    )

    function fnAddBlock(index: number) {
        var data: BlockData = new BlockData(BlockType.Text);
        setDocumentBlocks([...docmuentBlocks.slice(0, index), data, ...docmuentBlocks.slice(index, docmuentBlocks.length)])
        setDocumentFocus({index: index, selection:docmuentFocus.selection});
    }

    useEffect(
        () => {
            function focus() {
                var element = document.getElementById(`Input-${documentData.id}-${docmuentFocus.index}`) as HTMLTextAreaElement;
                if (element) {
                    element.setSelectionRange(docmuentFocus.selection, docmuentFocus.selection);
                    element.focus();
                }
                else setTimeout(focus, 10);
            }
            focus()
        }, [docmuentFocus]
    );

    return <div className={"flex flex-col overflow-hidden " + className} style={style}>
        <TabBox select={toolNumber} onSelect={setToolNumber} tabnames={["File", "Edit", "View"]}>
            <div>FileMenu</div>
            <div>EditMenu</div>
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
                                    data={block}
                                    fnAddBlock={fnAddBlock}
                                    fnSetFocus={setDocumentFocus}
                                    
                                />
                            ))}
            </div>
        </div>
        <button onClick={() => {saveDocument(); console.log(documentData)}}>Print</button>
    </div>
}