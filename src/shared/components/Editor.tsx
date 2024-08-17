"use client";

import React, { ChangeEventHandler, Component, CSSProperties, MutableRefObject, useCallback, useEffect, useRef, useState } from "react";
import { TabBox } from "./TabBox";  
import { IsUserMobile } from "@/utils/ClientStatus"

import "@/styles/Editor.css"

import pen from "@/../public/assets/pen.png";
import Image from "next/image";
import Modal from "@/shared/components/Modal"
import ReactModal from "react-modal";
import { DropEvent, FileRejection, useDropzone } from "react-dropzone";

enum BlockType {
    Text, Separator, H1, H2, H3, H4, Image
}

class BlockData {
    type: BlockType;

    text: string; /** For writable */
    source: string; /** For media */
    children: BlockData[]; /** For innerable */
    constructor(type: BlockType) {
        this.type = type;

        this.text = "";
        this.source = "";
        this.children = [];
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
}

type DrawingPeice = {
    segments: DrawingSegment[]
    color: string
}

class DrawingData {
    items: DrawingPeice[];
    color1: string;
    color2: string;
    color3: string;

    constructor() {
        this.items = [];
        this.color1 = "#000000";
        this.color2 = "#ff0000";
        this.color3 = "#0000ff";
    }
    
}
class Document {
    id: string;
    title: string;
    blocks: BlockData[];
    focus: FocusData;
    draw: DrawingData;

    spell: boolean;
    grid: boolean;
    constructor(id: string, title: string) {
        this.id = id;
        this.title = title;
        this.blocks = [new BlockData(BlockType.Text)];
        this.focus = {index:0, selection:FocusRange.zero()};
        this.draw = new DrawingData();

        this.spell = true;
        this.grid = true;
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

    setMediaSelectorMode: React.Dispatch<React.SetStateAction<"none" | "image" | "video">>
    mediaSelectorCallback: React.MutableRefObject<((url: string) => void) | null>
}

const Block: React.FC<BlockProps> = ({
    docid, index, blockData, focusData,
    fnAddBlock, fnSetFocus,
    setMediaSelectorMode, mediaSelectorCallback,
    ...props
}) => {
    
    const _EnableMultiline: boolean = blockData.type == BlockType.Text

    

    






    var [text, setText] = useState("");
    var [source, setSource] = useState<string | null>(null);
    useEffect(() => {
        setText(blockData.text)
        setTimeout(fixHeight, 5)

        blockData.source && setSource(blockData.source)
    }, [index, blockData])







    function fixHeight() {
        // textarea.style.height = 'auto';
        // let height = textarea.scrollHeight; // 높이
        // textarea.style.height = `${height}px`;
        var textarea = window.document.getElementById(`input-${docid}-${index}`) as HTMLTextAreaElement | null;
        var block = window.document.getElementById(`block-${docid}-${index}`) as HTMLDivElement | null;
        if (textarea && block) {
            var height: string = '24px';
            if (blockData.type == BlockType.Text) {
                height = `${textarea.value.split("\n").length*24}px`;
            } else {
                height = ''
            }
            textarea.style.height = height;
            block.style.height = `${textarea.clientHeight}px`;
        } else if (block) {
            block.style.height = "";
        }
    }
    function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
        if (event.key == "Enter") {
            if (event.shiftKey) {
                if (!_EnableMultiline) event.preventDefault();
                setTimeout(fixHeight, 100)
                return;
            } else { fnAddBlock(index+1); event.preventDefault(); return; }
        }
        var textarea = window.document.getElementById(`input-${docid}-${index}`) as HTMLTextAreaElement | null;
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
    function executeText(text: string) {
        blockData.text = text
        setText(blockData.text)
        if (text == "/sep" || text == "---") {
            blockData.type = BlockType.Separator
            blockData.text = "";
            setText("");
            fnSetFocus({index:index+1, selection:FocusRange.zero()});
        } else if (text == "/h1" || text == "# ") {
            blockData.type = BlockType.H1
            blockData.text = "";
            setText("");
            fnSetFocus({index:index, selection:FocusRange.zero()});
            fixHeight();
        } else if (text == "/h2" || text == "## ") {
            blockData.type = BlockType.H2
            blockData.text = "";
            setText("");
            fnSetFocus({index:index, selection:FocusRange.zero()});
            fixHeight();
        } else if (text == "/h3" || text == "### ") {
            blockData.type = BlockType.H3
            blockData.text = "";
            setText("");
            fnSetFocus({index:index, selection:FocusRange.zero()});
            fixHeight();
        } else if (text == "/h4" || text == "#### ") {
            blockData.type = BlockType.H4
            blockData.text = "";
            setText("");
            fnSetFocus({index:index, selection:FocusRange.zero()});
            fixHeight();
        } else if (text == "/image") {
            blockData.type = BlockType.Image
            blockData.text = "";
            setText("");
            setTimeout(fixHeight, 100);
            setMediaSelectorMode("image");
            mediaSelectorCallback.current = url => {
                setSource(url);
                fnSetFocus({index:index+1, selection:FocusRange.zero()});
            }
        }
    }
    var onChange: ChangeEventHandler<HTMLTextAreaElement> = useCallback(event => executeText(event.target.value), [index, blockData]);
    return <div id={`block-${docid}-${index}`} {...props} onKeyDown={onKeyDown}>
        {
        blockData.type == BlockType.Separator? <hr className="mt-[4px] mb-[3px] border-y-2" />
        :blockData.type == BlockType.Image?<img src={source ?? "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTbNX2nABlu-_8PGz9k2j6uexK1mucQgtGhhg&s"} className="select-none drag resize" draggable={false} />
        :
        <textarea 
                onMouseUp={onMouseUp}

                id={`input-${docid}-${index}`}

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
        }
    </div>
}

type DrawingPiece = {
    segments: { x: number, y: number }[],
    color: string
}

type CanvasProps = {
    id: string,
    drawingMode: boolean,
    drawingColor: string,
    drawingItems: MutableRefObject<DrawingPiece[]>,
    onDrawEnd: () => void
}

type CanvasState = {
    ctx: CanvasRenderingContext2D | null
}

class Canvas extends Component<CanvasProps, CanvasState> {
    canvasRef: React.RefObject<HTMLCanvasElement>;
    canvasWidth: number;
    canvasHeight: number;
    onDrawing: boolean;

    constructor(props: CanvasProps) {
        super(props);
        this.canvasRef = React.createRef<HTMLCanvasElement>();
        this.canvasWidth = 0;
        this.canvasHeight = 0;
        this.onDrawing = false;

        this.state = {
            ctx: null
        };
    }

    refresh = () => {
        const canvas = this.canvasRef.current;
        const width = canvas?.offsetWidth ?? this.canvasWidth;
        const height = canvas?.offsetHeight ?? this.canvasHeight;
        this.canvasWidth = width;
        this.canvasHeight = height;

        const { ctx } = this.state;
        const { drawingItems, drawingColor } = this.props;

        ctx?.clearRect(0, 0, width, height);
        drawingItems.current.forEach(
            piece => {
                ctx?.beginPath();
                if (ctx) ctx.strokeStyle = piece.color;
                piece.segments.forEach(
                    segment => ctx?.lineTo(segment.x * width, segment.y * width)
                );
                ctx?.stroke();
                ctx?.closePath();
            }
        );
        if (ctx) ctx.strokeStyle = drawingColor;
    }

    handleMouseDown = () => {
        this.onDrawing = true;
        const { ctx } = this.state;
        const { drawingItems, drawingColor } = this.props;

        ctx?.beginPath();
        drawingItems.current.push({ segments: [], color: drawingColor });
        if (ctx) ctx.strokeStyle = drawingColor;
    }

    handleMouseUpOrLeave = () => {
        this.onDrawing = false;
        this.state.ctx?.closePath();
        this.props.onDrawEnd();
    }

    handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (this.onDrawing) {
            const canvas = this.canvasRef.current;
            if (!canvas) return;

            const offsetX = e.nativeEvent.offsetX;
            const offsetY = e.nativeEvent.offsetY;

            const clientWidth = canvas.clientWidth;

            this.props.drawingItems.current[this.props.drawingItems.current.length - 1].segments.push({ x: offsetX / clientWidth, y: offsetY / clientWidth });

            this.state.ctx?.lineTo(offsetX, offsetY);
            this.state.ctx?.stroke();
        }
    }

    handleTouchStart = () => {
        this.onDrawing = true;
        const { ctx } = this.state;
        const { drawingItems, drawingColor } = this.props;

        ctx?.beginPath();
        drawingItems.current.push({ segments: [], color: drawingColor });
        if (ctx) ctx.strokeStyle = drawingColor;
    }

    handleTouchEnd = () => {
        this.onDrawing = false;
        this.state.ctx?.closePath();
        this.props.onDrawEnd();
    }

    handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
        if (this.onDrawing) {
            const canvas = this.canvasRef.current;
            if (!canvas) return;

            const touch = e.nativeEvent.touches[0];
            const rect = canvas.getBoundingClientRect();
            const offsetX = touch.clientX - rect.left;
            const offsetY = touch.clientY - rect.top;

            const clientWidth = canvas.clientWidth;

            this.props.drawingItems.current[this.props.drawingItems.current.length - 1].segments.push({ x: offsetX / clientWidth, y: offsetY / clientWidth });

            this.state.ctx?.lineTo(offsetX, offsetY);
            this.state.ctx?.stroke();
        }
    }

    handleNativeTouchMove = (e: TouchEvent) => {
        // Prevent the default behavior
        e.preventDefault();

        // Create a React-like synthetic event
        const syntheticEvent = {
            ...e,
            nativeEvent: e,
            currentTarget: e.currentTarget as EventTarget & HTMLCanvasElement,
            target: e.target as EventTarget & HTMLCanvasElement,
            // You can add any other properties you need here
        } as unknown as React.TouchEvent<HTMLCanvasElement>;

        // Call the actual handler
        this.handleTouchMove(syntheticEvent);
    }


    componentDidMount() {
        const canvas = this.canvasRef.current;
        const context = canvas?.getContext("2d");
        if (context) context.imageSmoothingQuality = "high";
        this.setState({ ctx: context ?? null }, this.refresh);

        
        this.canvasRef.current?.addEventListener('touchmove', this.handleNativeTouchMove, { passive: false });
    }

    componentDidUpdate(prevProps: CanvasProps) {
        if (prevProps.drawingColor !== this.props.drawingColor ||
            prevProps.drawingItems !== this.props.drawingItems) {
            this.refresh();
        }
        if (prevProps.drawingMode !== this.props.drawingMode) {
            this.onDrawing = false;
        }
    }

    componentWillUnmount() {
        this.canvasRef.current?.removeEventListener('touchmove', this.handleNativeTouchMove);
    }
    
    render() {
        const { id, drawingMode } = this.props;
        return (
            <canvas
                id={id}
                className={"absolute top-0 w-full h-full" + (drawingMode ? "" : " pointer-events-none")}
                width={this.canvasRef.current?.offsetWidth}
                height={this.canvasRef.current?.offsetHeight}
                ref={this.canvasRef}
                onMouseDown={this.handleMouseDown}
                onMouseUp={this.handleMouseUpOrLeave}
                onMouseLeave={this.handleMouseUpOrLeave}
                onMouseMove={this.handleMouseMove}
                onTouchStart={this.handleTouchStart}
                onTouchEnd={this.handleTouchEnd}
                onTouchMove={this.handleTouchMove}
            />
        );
    }
}

export default function Editor({className, style}: {className?: string | undefined, style?: CSSProperties | undefined}) {
    var documentData = new Document("testdoc", "haru");

    // Modal Area
    var [mediaSelectorMode, setMediaSelectorMode] = useState<"none" | "image" | "video">("none");
    var mediaSelectorCallback = useRef<((url: string) => void) | null>(null);
    var [mediaSelectorUrl, setMediaSelectorUrl] = useState<string>("");
    
    const onDrop = useCallback((acceptedFiles: File[] ) => {
        // Do something with the files
            console.log(acceptedFiles)
    }, [])
    const mediaSelectorDropzone = useDropzone({ maxFiles: 1, onDrop: onDrop, noKeyboard: true })

    // Tool Area
    var [toolNumber, setToolNumber] = useState(-1);

    var [drawingMode, setDrawingMode] = useState(0);

    var [drawingColor1, setDrawingColor1] = useState(documentData.draw.color1);
    var [drawingColor2, setDrawingColor2] = useState(documentData.draw.color2);
    var [drawingColor3, setDrawingColor3] = useState(documentData.draw.color3);
    useEffect(() => { documentData.draw.color1=drawingColor1 }, [drawingColor1]);
    useEffect(() => { documentData.draw.color2=drawingColor2 }, [drawingColor2]);
    useEffect(() => { documentData.draw.color3=drawingColor3 }, [drawingColor3]);
    var drawingItems = useRef(documentData.draw.items);
    // Tool Area

    
    // Editor Area
    var [docmuentBlocks, setDocumentBlocks] = useState(documentData.blocks);
    useEffect(() => { documentData.blocks = docmuentBlocks }, [docmuentBlocks]);
    var [docmuentFocus, setDocumentFocus] = useState(documentData.focus);
    useEffect(() => { documentData.focus = docmuentFocus }, [docmuentFocus]);
    var [docmuentSpell, setDocumentSpell] = useState(documentData.spell);
    useEffect(() => { documentData.spell = docmuentSpell }, [docmuentSpell]);
    var [docmuentGrid, setDocumentGrid] = useState(documentData.grid);
    useEffect(() => { documentData.grid = docmuentGrid }, [docmuentGrid]);



    var [targettingBlock, setTargettingBlock] = useState(-1);
    var [draggingBlock, setDraggingBlock] = useState(-1);
    var [draggingStick, setDraggingStick] = useState(-1);
    var [isDraggingBlock, setIsDraggingBlock] = useState(false);



    function fnAddBlock(index: number) {
        var data: BlockData = new BlockData(BlockType.Text);
        setDocumentBlocks([...docmuentBlocks.slice(0, index), data, ...docmuentBlocks.slice(index, docmuentBlocks.length)])
        setDocumentFocus({index: index, selection:docmuentFocus.selection});
    }

    function focus() {
        var element = document.getElementById(`input-${documentData.id}-${docmuentFocus.index}`) as HTMLTextAreaElement;
        if (element) {
            var selection = docmuentFocus.selection.toRawCol(element.value);
            element.setSelectionRange(selection.start, selection.end);
            element.focus();
        }
        else setTimeout(focus, 5);
    }
    useEffect(
        focus, [docmuentFocus]
    );

    return <div className={"flex flex-col overflow-hidden " + className} style={style}>

        <ReactModal isOpen={mediaSelectorMode != "none"} onRequestClose={() => setMediaSelectorMode("none")}>
            <div className={"flex flex-col h-full w-[full] items-center"}>
                <div className="w-[50%] 
                                border-4 border-sky-500 border-dashed rounded-3xl
                                flex justify-center
                                cursor-pointer
                                py-6 m-5
                                transition-all
                                "
                     style={mediaSelectorDropzone.isDragActive? {scale:"120%"} : {}}
                     {...mediaSelectorDropzone.getRootProps()}
                >
                    <p className="select-none">
                        <span className="text-2xl block">Drop {mediaSelectorMode} file</span>
                        <button className="text-gray-500 block">Or click here to choose</button>
                    </p>
                    <input id={`input-mediaselector-${documentData.id}`} className="hidden" type="file" {...mediaSelectorDropzone.getInputProps()}/>
                </div>
                <div className="flex w-full my-6">
                    <div className="grow flex items-center"><hr className="grow border-y-2 border-dashed"/></div>
                    <span className="text-slate-400">OR</span>
                    <div className="grow flex items-center"><hr className="grow border-y-2 border-dashed"/></div>
                </div>
                <div>
                    Input url for {mediaSelectorMode}
                    <input className="border-2" value={mediaSelectorUrl} onChange={e => setMediaSelectorUrl(e.target.value)}/>
                </div>
                
                <div className="grow overflow-hidden">
                    <img src={mediaSelectorUrl} alt="Image Preview"></img>
                </div>

                <button className="w-full bg-sky-100 py-2" onClick={() => {
                    mediaSelectorCallback.current && mediaSelectorCallback.current(mediaSelectorUrl);
                    mediaSelectorCallback.current = () => {};
                    setMediaSelectorMode("none");
                }}>Done!</button>
            </div>
        </ReactModal>

        <TabBox select={toolNumber} onSelect={setToolNumber} tabnames={["File", "Edit", "View"]}>
            <div>FileMenu</div>
            <div className="flex flex-row">
                <div className="flex flex-row">
                    <div className="flex flex-col cursor-pointer items-center">
                        <Image className={"h-8 w-8 rounded-lg" + (drawingMode==1?" bg-slate-200":"")} src={pen} alt="" onClick={() => setDrawingMode(drawingMode==1 ? 0 : 1)}/>
                        <input id={`input-pencolor1-${documentData.id}`} className="h-4 w-10" type="color" value={drawingColor1} onChange={e => setDrawingColor1(e.target.value)} />
                    </div>
                    <div className="flex flex-col cursor-pointer items-center">
                        <Image className={"h-8 w-8 rounded-lg" + (drawingMode==2?" bg-slate-200":"")} src={pen} alt="" onClick={() => setDrawingMode(drawingMode==2 ? 0 : 2)}/>
                        <input id={`input-pencolor2-${documentData.id}`} className="h-4 w-10" type="color" value={drawingColor2} onChange={e => setDrawingColor2(e.target.value)} />
                    </div>
                    <div className="flex flex-col cursor-pointer items-center">
                        <Image className={"h-8 w-8 rounded-lg" + (drawingMode==3?" bg-slate-200":"")} src={pen} alt="" onClick={() => setDrawingMode(drawingMode==3 ? 0 : 3)}/>
                        <input id={`input-pencolor3-${documentData.id}`} className="h-4 w-10" type="color" value={drawingColor3} onChange={e => setDrawingColor3(e.target.value)} />
                    </div>
                </div>
            </div>
            <div className="flex flex-col">
                <div>
                    <input id={`input-docspell-${documentData.id}`} className="cursor-pointer" type="checkbox" checked={docmuentSpell} onChange={() => setDocumentSpell(!docmuentSpell)} />
                    <label htmlFor={`input-docspell-${documentData.id}`} className="cursor-pointer">Check Spell</label>
                </div>
                <div>
                    <input id={`input-docgrid-${documentData.id}`} className="cursor-pointer" type="checkbox" checked={docmuentGrid} onChange={() => setDocumentGrid(!docmuentGrid)} />
                    <label htmlFor={`input-docgrid-${documentData.id}`} className="cursor-pointer">Use Grid</label>
                </div>
            </div>
        </TabBox>
        
        <div className="flex flex-col flex-auto items-center overflow-y-auto overflow-x-hidden h-full bg-slate-100 bluescroll"
            // For dragdrop system
            style={isDraggingBlock ? { cursor:"pointer" } : {}}
            onMouseUp={() => {setDraggingBlock(-1); setIsDraggingBlock(false)}}
            onMouseMove={event => {
                var docview = document.getElementById("documentview-"+documentData.id);
                var draggingBlock = document.getElementById("draggingblock-"+documentData.id);
                if (docview == null || draggingBlock == null) return;
                draggingBlock.style.left = `${event.clientX + 8}px`;
                draggingBlock.style.top = event.clientY + "px"; // Plus 8 cause mr-2
                
                var blocks = Array.from(docview.getElementsByTagName("div")).filter(element => element.id.startsWith(`block-${documentData.id}`))
                // console.log(blocks)
                // TODO
            }}
        >
            <div id={"documentview-"+documentData.id} className={"relative flex flex-col bg-white grow" + (docmuentGrid? " editor-grid":"")} style={{width:"70%"}}>
                <div id={"draggingblock-"+documentData.id}
                    className={"fixed text-gray-400"+(isDraggingBlock?"":" hidden")}
                    style={{left:0, top:0}}
                />
                <Canvas id={"canvas-"+documentData.id} drawingMode={drawingMode != 0} drawingColor={drawingMode==3?drawingColor3:drawingMode==2?drawingColor2:drawingColor1} drawingItems={drawingItems} onDrawEnd={ () => documentData.draw.items = drawingItems.current }/>
                    
                {/* <hr key={"blockplace-"+documentData.id+"-0"} id={"blockplace-"+documentData.id+"-0"} className="border-y-2 border-cyan-400" style={(isDraggingBlock && draggingStick)?{}:{display : "none"}}></hr> */}
                {docmuentBlocks.map((block, index) => (
                                    <div key={"blockholder-"+documentData.id+"-"+index}>
                                        <div key={"blocksidetool-"+documentData.id+"-"+index} className={"absolute right-full float-left flex items-start"+(!isDraggingBlock && (targettingBlock==index || targettingBlock==index+0.5)?"":" hidden")}
                                            onMouseEnter={() => setTargettingBlock(index+0.5)}
                                            onMouseLeave={() => (targettingBlock==index+0.5) && setTargettingBlock(-1)}>
                                            <button className="font-bold select-none px-1 rounded-l text-gray-400 hover:bg-gray-200 active:bg-gray-300"
                                                    onClick={() => {
                                                        setDocumentBlocks([...docmuentBlocks,new BlockData(BlockType.Text)]);
                                                        setDocumentFocus({index: docmuentBlocks.length, selection:FocusRange.zero()});
                                                    }}
                                            >+</button>
                                            <button className="font-bold select-none px-1 rounded-l text-gray-400 hover:bg-gray-200 active:bg-gray-300"
                                                    onMouseDown={() => {
                                                        var draggingBlock = document.getElementById("draggingblock-"+documentData.id);
                                                        if (draggingBlock) draggingBlock.innerHTML = document.getElementById("block-"+documentData.id+"-"+index)?.innerHTML ?? "";
                                                        setDraggingBlock(index);
                                                    }}
                                                    onMouseLeave={() => setIsDraggingBlock(isDraggingBlock || (draggingBlock != -1))}
                                            >::</button>
                                        </div>
                                        <Block
                                            key={"block-"+documentData.id+"-"+index}

                                            className={"m-0 bg-transparent"+(drawingMode?" select-none":"")}
                                            spellCheck={docmuentSpell}

                                            onMouseEnter={() => setTargettingBlock(index)}
                                            onMouseLeave={() => targettingBlock==index && setTargettingBlock(-1)}

                                            docid={documentData.id}
                                            index={index}
                                            blockData={block}
                                            focusData={docmuentFocus}
                                            fnAddBlock={fnAddBlock}
                                            fnSetFocus={setDocumentFocus}

                                            setMediaSelectorMode={setMediaSelectorMode}
                                            mediaSelectorCallback={mediaSelectorCallback}
                                        />
                                    </div>
                            ))}
            </div>
        </div>
        <button onClick={() => console.log(documentData)}>Print</button>
    </div>
}