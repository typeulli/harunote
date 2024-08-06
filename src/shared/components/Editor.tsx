"use client";

import React, { ChangeEventHandler, CSSProperties, useCallback, useEffect, useState } from "react";
import { TabBox } from "./TabBox";  


enum BlockType {
    Text, Separator, H1
}

class BlockData {
    type: BlockType;
    data: string;
    constructor(type: BlockType) {
        this.type = type;
        this.data = "";
    }
}
class FocusRange {
    startLine: number
    startCol: number
    endLine: number
    endCol: number
    constructor(startLine: number, startCol: number, endLine: number, endCol: number) {
        this.startLine = startLine;
        this.startCol = startCol;
        this.endLine = endLine;
        this.endCol = endCol;
    }

    static zero(): FocusRange { return new FocusRange(0, 0, 0, 0); }
    static col(line: number, col: number): FocusRange { return new FocusRange(line, col, line, col); }

    static fromSource(source: string, startCol: number, endCol: number): FocusRange {
        const lines = source.split('\n');
        let lastLineEndCol = 0;
        let startLine = 0;
        let endLine = 0;

        for (let i = 0; i < lines.length; i++) {
            const lineLength = lines[i].length + 1; // +1 for the newline character
            if (lastLineEndCol + lineLength > startCol && startLine === 0) {
                startLine = i;
            }
            if (lastLineEndCol + lineLength > endCol) {
                endLine = i;
                break;
            }
            lastLineEndCol += lineLength;
        }

        const startColInLine = startCol - lastLineEndCol;
        const endColInLine = endCol - lastLineEndCol;

        return new FocusRange(startLine, startColInLine, endLine, endColInLine);
    }

    toRawCol(source: string): {start: number, end: number} {
            const lines = source.split('\n');

            function index (line: number, col: number){
                var raw = 0;
                if (line == -1) line = lines.length-1;
                if (col == -1) col = lines[line].length;
                line = Math.min(lines.length-1, line)
                col = Math.min(lines[line].length, col);


                for (let i=0; i<line; i++) raw += lines[i].length + 1;
                raw += col
                return raw
            }
    
            return { start: index(this.startLine, this.startCol), end: index(this.endLine, this.endCol) };
    }
}
type FocusData = {
    index: number, 
    selection: FocusRange
}
class Document {
    id: string;
    blocks: BlockData[];
    focus: FocusData;

    spell: boolean;
    constructor(id: string) {
        this.id = id;
        this.blocks = [new BlockData(BlockType.Text)];
        this.focus = {index:0, selection:FocusRange.zero()};

        this.spell = true;
    }
    insertBlock = (block: BlockData, index: number) => {
        this.blocks = [...this.blocks.slice(0, index), block, ...this.blocks.slice(index, this.blocks.length)];
    }
}


function Block({
    className, style,
    id, index, data, focusData,
    fnAddBlock, fnSetFocus
} : {
    className?: string | undefined, style?: CSSProperties | undefined
    id: string, index: number, data: BlockData, focusData: FocusData
    fnAddBlock: (index: number) => void, fnSetFocus: (value: FocusData) => void
}) {
    
    const _EnableMultiline: boolean = data.type == BlockType.Text

    
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
        if (event.key == "Enter") {
            if (event.shiftKey) {
                if (!_EnableMultiline) event.preventDefault();
                return;
            } else { fnAddBlock(index+1); event.preventDefault(); return; }
        }
        var textarea = window.document.getElementById(`Input-${id}-${index}`) as HTMLTextAreaElement | null;
        var source = textarea?.value;
        var selectionStart = textarea?.selectionStart ?? -1;
        var selectionEnd = textarea?.selectionEnd ?? -1;
        var firstLineEnd = source?.indexOf("\n") ?? -1;
        var lastLineStart = source?.lastIndexOf("\n") ?? -1;
        if ((firstLineEnd  == -1 || selectionStart <= firstLineEnd) && event.key == "ArrowUp"  ) { 
            fnSetFocus({index:index-1, selection:FocusRange.col(-1,focusData.selection.startCol)}); 
            event.preventDefault(); return; 
        };
        if ((lastLineStart == -1 || selectionEnd   > lastLineStart) && event.key == "ArrowDown") {
            fnSetFocus({index:index+1, selection:FocusRange.col(0, focusData.selection.endCol)});
            event.preventDefault(); return;
        };
        if (source) {
            if (selectionStart == 0 && event.key == "ArrowLeft") {
                fnSetFocus({index:index-1, selection:FocusRange.col(-1, -1)}); //TODO
                event.preventDefault(); return;
            };
            if (selectionEnd == (textarea?.value.length ?? -1) && event.key == "ArrowRight") {
                fnSetFocus({index:index+1, selection:FocusRange.zero()});
                event.preventDefault(); return; 
            };
        }
    }
    function onKeyUp(event: React.KeyboardEvent<HTMLDivElement>) {
        var textarea = window.document.getElementById(`Input-${id}-${index}`) as HTMLTextAreaElement | null;
        var source = textarea?.value;
        var selectionStart = textarea?.selectionStart ?? -1;
        var selectionEnd = textarea?.selectionEnd ?? -1;
        
        if (source && selectionStart != -1 && selectionEnd != -1) {
            var current = FocusRange.fromSource(source, selectionStart, selectionEnd);
            if (event.key == "ArrowUp" || event.key == "ArrowDown") {
                if (focusData.selection.startCol > current.startCol) { current.startCol = focusData.selection.startCol; }
                if (focusData.selection.endCol > current.endCol) { current.endCol = focusData.selection.endCol; }
            }
            fnSetFocus({index:index, selection:current})
        }
    }
    var [text, setText] = useState("");
    function executeText(text: string) {
        data.data = text
        setText(data.data)
        if (text == "/sep" || text == "---") {
            data.type = BlockType.Separator
            data.data = "";
            setText("");
            fnSetFocus({index:index+1, selection:FocusRange.zero()});
        } else if (text == "/h1" || text == "# ") {
            data.type = BlockType.H1
            data.data = "";
            setText("");
            fnSetFocus({index:index+1, selection:FocusRange.zero()});
        }
    }
    useEffect(() => {
        setText(data.data)
        _EnableMultiline && setTimeout(() => {
            var target = window.document.getElementById(`Input-${id}-${index}`);
            if (target) fixHeight(target as HTMLTextAreaElement);
        }, 5)
    }, [index, data])
    var onChange: ChangeEventHandler<HTMLTextAreaElement> = useCallback(event => executeText(event.target.value), [index, data]);
    return <div id={`Block-${id}-${index}`} className={className} style={style} onKeyDown={onKeyDown} onKeyUp={onKeyUp}>
        <textarea 
                id={`Input-${id}-${index}`}

                className={"placeholder:text-white focus:placeholder:text-gray-400 overflow-hidden resize-none outline-none"
                    + (data.type == BlockType.Text? " h-[30px]" : "")
                    + (data.type == BlockType.H1?   " h-[2em] text-[2em] mr-0 ml-0 font-bold" : "") // mt-[0.67em] mb-[0.67em]
                }
                style={{width:"100%", border:0}}

                value={text} onChange={onChange} placeholder={"Write down somthing surprising!"}
                onInput={() => {
                    if (_EnableMultiline) {
                        var target = window.document.getElementById(`Input-${id}-${index}`);
                        if (target) fixHeight(target as HTMLTextAreaElement);
                    }
                }}/>
    </div>
}


export default function Editor({className, style}: {className?: string | undefined, style?: CSSProperties | undefined}) {
    var documentData = new Document("haru");

    var [toolNumber, setToolNumber] = useState(-1);

    
    var [docmuentBlocks, setDocumentBlocks] = useState(documentData.blocks);
    var [docmuentFocus, setDocumentFocus] = useState(documentData.focus);
    var [docmuentSpell, setDocumentSpell] = useState(documentData.spell);

    function saveDocument() {
        documentData.blocks = docmuentBlocks;
        documentData.focus = docmuentFocus;
        documentData.spell = docmuentSpell;
    }
    useEffect(
        saveDocument,
        [docmuentBlocks, docmuentFocus, docmuentSpell]
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
                    var selection = docmuentFocus.selection.toRawCol(element.value);
                    element.setSelectionRange(selection.start, selection.end);
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
                                    focusData={docmuentFocus}
                                    fnAddBlock={fnAddBlock}
                                    fnSetFocus={setDocumentFocus}
                                    
                                />
                            ))}
            </div>
        </div>
        <button onClick={() => {saveDocument(); console.log(documentData)}}>Print</button>
    </div>
}