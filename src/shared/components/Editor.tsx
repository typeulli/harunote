"use client";

import React, { ChangeEventHandler, CSSProperties, MutableRefObject, useCallback, useEffect, useRef, useState } from "react";
import { TabBox } from "./TabBox";  
import { IsUserMobile } from "@/utils/ClientStatus"

import "@/styles/Editor.css"

import pen from "@/../public/assets/pen.png";
import Image from "next/image";

enum BlockType {
    Text, Separator, H1, H2, H3, H4
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
        var temp_st = Math.min(startCol, endCol);
        endCol = Math.max(startCol, endCol);
        startCol = temp_st;
        
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

type DrawingSegment = {
    x: number
    y: number
    color: string
}

class DrawingData {
    items: DrawingSegment[][];
    color: string;

    constructor() {
        this.items = [];
        this.color = "#000000";
    }
    
}
class Document {
    id: string;
    blocks: BlockData[];
    focus: FocusData;
    draw: DrawingData;

    spell: boolean;
    constructor(id: string) {
        this.id = id;
        this.blocks = [new BlockData(BlockType.Text)];
        this.focus = {index:0, selection:FocusRange.zero()};
        this.draw = new DrawingData();

        this.spell = true;
    }
    insertBlock = (block: BlockData, index: number) => {
        this.blocks = [...this.blocks.slice(0, index), block, ...this.blocks.slice(index, this.blocks.length)];
    }
}

interface BlockProps extends React.HTMLProps<HTMLDivElement> {
    docid: string;
    index: number;
    blockData: BlockData;
    focusData: FocusData;

    fnAddBlock: (index: number) => void;
    fnSetFocus: (value: FocusData) => void;
}

const Block: React.FC<BlockProps> = ({
    docid, index, blockData, focusData,
    fnAddBlock, fnSetFocus,
    ...props
}) => {
    
    const _EnableMultiline: boolean = blockData.type == BlockType.Text

    
    if (blockData.type == BlockType.Separator)
        return <hr className="mt-[4px] mb-[3px] border-y-2" />
        // return <div className="mt-[14px] mb-[15px] h-[10px] bg-slate-500"></div>














    function fixHeight() {
        // textarea.style.height = 'auto';
        // let height = textarea.scrollHeight; // 높이
        // textarea.style.height = `${height}px`;
        var textarea = window.document.getElementById(`Input-${docid}-${index}`) as HTMLTextAreaElement | null;
        var block = window.document.getElementById(`Block-${docid}-${index}`) as HTMLDivElement | null;
        if (textarea && block) {
            var height: string = '24px';
            if (blockData.type == BlockType.Text) {
                height = `${textarea.value.split("\n").length*24}px`;
            } else {
                height = ''
            }
            textarea.style.height = height;
            block.style.height = `${textarea.clientHeight}px`;
        }
    }
    function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
        if (event.key == "Enter") {
            if (event.shiftKey) {
                if (!_EnableMultiline) event.preventDefault();
                return;
            } else { fnAddBlock(index+1); event.preventDefault(); return; }
        }
        var textarea = window.document.getElementById(`Input-${docid}-${index}`) as HTMLTextAreaElement | null;
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
        
        if (source && selectionStart != -1 && selectionEnd != -1 && event.key.startsWith("Arrow")) {
            var current = FocusRange.fromSource(source, selectionStart, selectionEnd);
            if (event.key == "ArrowLeft") current = FocusRange.fromSource(source, Math.max(selectionStart-1, 0), Math.max(selectionStart-1, 0));
            if (event.key == "ArrowRight") current = FocusRange.fromSource(source, Math.min(selectionStart+1, source.length-1), Math.min(selectionStart+1, source.length-1));
            if (event.key == "ArrowUp") {
                current = FocusRange.fromSource(source, selectionStart, selectionStart);
                current.startLine = Math.max(current.startLine - 1, 0);
                current.endLine = current.startLine;
            }
            if (event.key == "ArrowDown") {
                current = FocusRange.fromSource(source, selectionStart, selectionStart);
                current.startLine = Math.min(current.startLine + 1, source.split("\n").length);
                current.endLine = current.startLine;
            }
            if (event.key == "ArrowUp" || event.key == "ArrowDown") {
                if (focusData.selection.startCol > current.startCol) { current.startCol = focusData.selection.startCol; }
                if (focusData.selection.endCol > current.endCol) { current.endCol = focusData.selection.endCol; }
            }
            fnSetFocus({index:index, selection:current});
            event.preventDefault();
        }
    }
    function onMouseUp(event: React.MouseEvent<HTMLTextAreaElement>) {
        var textarea = event.target as HTMLTextAreaElement | null;
        var source = textarea?.value;
        var selectionStart = textarea?.selectionStart ?? -1;
        var selectionEnd = textarea?.selectionEnd ?? -1;
        if (source) 
            fnSetFocus({index:index, selection:FocusRange.fromSource(source, selectionStart, selectionEnd)});
    }
    var [text, setText] = useState("");
    function executeText(text: string) {
        blockData.data = text
        setText(blockData.data)
        if (text == "/sep" || text == "---") {
            blockData.type = BlockType.Separator
            blockData.data = "";
            setText("");
            fnSetFocus({index:index+1, selection:FocusRange.zero()});
        } else if (text == "/h1" || text == "# ") {
            blockData.type = BlockType.H1
            blockData.data = "";
            setText("");
            fnSetFocus({index:index, selection:FocusRange.zero()});
            setTimeout(fixHeight, 100)
        } else if (text == "/h2" || text == "## ") {
            blockData.type = BlockType.H2
            blockData.data = "";
            setText("");
            fnSetFocus({index:index, selection:FocusRange.zero()});
            setTimeout(fixHeight, 100)
        } else if (text == "/h3" || text == "### ") {
            blockData.type = BlockType.H3
            blockData.data = "";
            setText("");
            fnSetFocus({index:index, selection:FocusRange.zero()});
            setTimeout(fixHeight, 100)
        } else if (text == "/h4" || text == "#### ") {
            blockData.type = BlockType.H4
            blockData.data = "";
            setText("");
            fnSetFocus({index:index, selection:FocusRange.zero()});
            setTimeout(fixHeight, 100)
        }
    }
    useEffect(() => {
        setText(blockData.data)
        setTimeout(fixHeight, 5)
    }, [index, blockData])
    var onChange: ChangeEventHandler<HTMLTextAreaElement> = useCallback(event => executeText(event.target.value), [index, blockData]);
    return <div id={`Block-${docid}-${index}`} {...props} onKeyDown={onKeyDown}>
        <textarea 
                onMouseUp={onMouseUp}

                id={`Input-${docid}-${index}`}

                className={"bg-transparent placeholder:text-transparent focus:placeholder:text-gray-400 overflow-hidden resize-none outline-none"
                    + (blockData.type == BlockType.Text? " block h-[30px]" : "")
                    + (blockData.type == BlockType.H1?   " block h-[1.34em] text-[2em] mr-0 ml-0 font-bold" : "") // mt-[0.67em] mb-[0.67em]
                    + (blockData.type == BlockType.H2?   " block h-[1.66em] text-[1.5em] mr-0 ml-0 font-bold" : "") // mt-[0.83em] mb-[0.83em]
                    + (blockData.type == BlockType.H3?   " block h-[2em] text-[1.17em] mr-0 ml-0 font-bold" : "") // mt-[0.83em] mb-[0.83em]
                    + (blockData.type == BlockType.H4?   " block mr-0 ml-0 font-bold" : "") // mt-[0.83em] mb-[0.83em]
                    
                }
                style={{width:"100%", border:0}}

                value={text} onChange={onChange} placeholder={"Write down something surprising!"}
                onInput={fixHeight}/>
    </div>
}


function Canvas({id, drawingMode, drawingColor, drawingItems, onDrawEnd}: {id: string, drawingMode: boolean, drawingColor: string, drawingItems: MutableRefObject<DrawingSegment[][]>, onDrawEnd: () => void}) {
    var canvasRef: React.MutableRefObject<HTMLCanvasElement | null> = useRef(null);
    var [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
    var [canvasWidth, setCanvasWidth] = useState(256);
    var [canvasHeight, setCanvasHeight] = useState(256);
    var onDrawing = false;

    function refresh() {
        ctx?.clearRect(0, 0, canvasWidth, canvasHeight);
        drawingItems.current.forEach(
            line => {
                ctx?.beginPath();
                line.forEach(
                    segment => {
                        const x = segment.x * canvasWidth;
                        const y = segment.y * canvasHeight;
                        
                        if (ctx) ctx.strokeStyle = segment.color
                        ctx?.lineTo(x, y);
                        ctx?.stroke();
                    }
                );
                ctx?.closePath();
            }
        );
        if (ctx) ctx.strokeStyle = drawingColor;
    }
    useEffect(refresh, [drawingColor, drawingItems])

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (context)
            context.imageSmoothingQuality = "high"
            
        setCtx(context ?? null);
        canvas?.clientWidth && setCanvasWidth(canvas.clientWidth);
        canvas?.clientHeight && setCanvasHeight(canvas.clientHeight);

        refresh();
    }, []);
    useEffect(() => {onDrawing=false}, [drawingMode]);



    return <canvas 
        id={id}
        className={"absolute top-0 w-full h-full" + (drawingMode? "":" pointer-events-none")}
        width={canvasWidth} height={canvasHeight}
        ref={canvasRef}
        onMouseDown={e => { onDrawing = true; ctx?.beginPath(); drawingItems.current.push([])}}
        onMouseUp={e => { onDrawing = false; ctx?.closePath(); onDrawEnd(); }}
        onMouseLeave={e => { onDrawing = false; ctx?.closePath(); onDrawEnd(); }}
        onMouseMove={e => {
            if (onDrawing) {
                const canvas = canvasRef.current;
                if (!canvas) return
    
                const xrate = e.nativeEvent.offsetX / canvas.clientWidth;
                const yrate = e.nativeEvent.offsetY / canvas.clientHeight;

                drawingItems.current[drawingItems.current.length-1].push({x: xrate, y: yrate, color: drawingColor});
                
                if (ctx) ctx.strokeStyle = drawingColor;
                ctx?.lineTo(xrate * canvasWidth, yrate * canvasHeight);
                ctx?.stroke();
            }
        }}
    />
}

export default function Editor({className, style}: {className?: string | undefined, style?: CSSProperties | undefined}) {
    var documentData = new Document("haru");

    // Tool Area
    var [toolNumber, setToolNumber] = useState(-1);

    var [drawingMode, setDrawingMode] = useState(false);
    useEffect(() => setDrawingMode(IsUserMobile()), []);
    var [drawingColor, setDrawingColor] = useState(documentData.draw.color);
    useEffect(() => { documentData.draw.color=drawingColor }, [drawingColor]);
    var drawingItems = useRef(documentData.draw.items);
    // Tool Area

    
    // Editor Area
    var [docmuentBlocks, setDocumentBlocks] = useState(documentData.blocks);
    useEffect(() => { documentData.blocks = docmuentBlocks }, [docmuentBlocks]);
    var [docmuentFocus, setDocumentFocus] = useState(documentData.focus);
    useEffect(() => { documentData.focus = docmuentFocus }, [docmuentFocus]);
    var [docmuentSpell, setDocumentSpell] = useState(documentData.spell);
    useEffect(() => { documentData.spell = docmuentSpell }, [docmuentSpell]);

    var [draggingBlock, setDraggingBlock] = useState(-1);
    var [isDraggingBlock, setIsDraggingBlock] = useState(false);
    var [virtualBlockPosition, setVirtualBlockPosition] = useState([0, 0]);



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
                else setTimeout(focus, 5);
            }
            focus()
        }, [docmuentFocus]
    );

    return <div className={"flex flex-col overflow-hidden " + className} style={style}>
        <TabBox select={toolNumber} onSelect={setToolNumber} tabnames={["File", "Edit", "View"]}>
            <div>FileMenu</div>
            <div className="flex flex-row">
                EditMenu
                <input type="checkbox" checked={drawingMode} onChange={e => setDrawingMode(!drawingMode)} />
                <div className="flex flex-col cursor-pointer" onClick={() => Array.from(document.getElementsByTagName("input")).filter(e => e.id==`input-pencolor-${documentData.id}`).pop()?.click()}>
                    <Image className="h-8 w-8" src={pen} alt=""/>
                    <input id={`input-pencolor-${documentData.id}`} className="h-4 w-10" type="color" value={drawingColor} onChange={e => setDrawingColor(e.target.value)} />
                </div>
            </div>
            <div>
                <div className="float-left">
                    <input id={`input-docspell-${documentData.id}`} className="" type="checkbox" checked={docmuentSpell} onChange={e => setDocumentSpell(!docmuentSpell)} />
                    <span>Check Spell</span>
                </div>
            </div>
        </TabBox>
        
        <div className="flex flex-col flex-auto items-center overflow-y-auto overflow-x-hidden h-full bg-slate-100 bluescroll"

            // For dragdrop system
            style={isDraggingBlock ? { cursor:"pointer" } : {}}
            onMouseUp={() => {setDraggingBlock(-1); setIsDraggingBlock(false)}}
            onMouseMove={event => {
                var docview = document.getElementById("documentview-"+documentData.id);
                if (docview == null) return;
                var rect = docview.getClientRects()[0];
                setVirtualBlockPosition([event.clientX - rect.x + 8, event.clientY - rect.y]); // Plus 8 cause mr-2
            }}
        >
            <div id={"documentview-"+documentData.id} className="Editor relative flex flex-col bg-white grow" style={{width:"70%"}}>
                <div  id={"draggingblock-"+documentData.id}
                    className={"absolute text-gray-400"+(isDraggingBlock?"":" hidden")}
                    style={{left:virtualBlockPosition[0], top:virtualBlockPosition[1]}}
                />
                <Canvas id={"canvas-"+documentData.id} drawingMode={drawingMode} drawingColor={drawingColor} drawingItems={drawingItems} onDrawEnd={() => documentData.draw.items=drawingItems.current }/>
                {docmuentBlocks.map((block, index) => (
                                <div key={"blockholder-"+documentData.id+"-"+index}>
                                    <div className="absolute right-full float-left mr-2 flex items-start">
                                        <button className="font-bold text-gray-500 select-none"
                                                onMouseDown={() => {
                                                    var draggingBlock = document.getElementById("draggingblock-"+documentData.id)
                                                    console.log(document.getElementById("block-"+documentData.id+"-"+index)?.innerHTML ?? "");
                                                    if (draggingBlock) draggingBlock.innerHTML = document.getElementById("block-"+documentData.id+"-"+index)?.innerHTML ?? "";
                                                    setDraggingBlock(index)
                                                }}
                                                onMouseLeave={() => setIsDraggingBlock(isDraggingBlock || (draggingBlock != -1))}
                                        >::</button>
                                        <button className="font-bold text-gray-500 select-none">+</button>
                                    </div>
                                    <Block
                                        key={"block-"+documentData.id+"-"+index}

                                        id={"block-"+documentData.id+"-"+index}
                                        className={"m-0 grow-0 bg-transparen"+(drawingMode?" select-none":"")}
                                        spellCheck={docmuentSpell}

                                        docid={documentData.id}
                                        index={index}
                                        blockData={block}
                                        focusData={docmuentFocus}
                                        fnAddBlock={fnAddBlock}
                                        fnSetFocus={setDocumentFocus}
                                        
                                    />
                                </div>
                            ))}
            </div>
        </div>
        <button onClick={() => console.log(documentData)}>Print</button>
        <button onClick={() => setDrawingColor("#ff0000")}>Canvas Color To Red</button>
        <button onClick={() => setDrawingColor("#000000")}>Canvas Color To Black</button>
    </div>
}