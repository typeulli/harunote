export class StyledTextStyle {
    constructor(
        public fg?: string | undefined,
        public bg?: string | undefined,
        public bold?: boolean | undefined,
        public underline?: boolean | undefined
    ) {}
    
    static create({ fg, bg, bold, underline }: { fg?: string; bg?: string; bold?: boolean; underline?: boolean }): StyledTextStyle {
        return new StyledTextStyle(fg, bg, bold, underline);
    }

    eqstyle(other: StyledTextStyle): boolean {
        return this.fg === other.fg &&
               this.bg === other.bg &&
               this.bold === other.bold &&
               this.underline === other.underline;
    }
}

export class StyledTextData extends StyledTextStyle {
    constructor(
        public text: string,
        fg?: string,
        bg?: string,
        bold?: boolean,
        underline?: boolean
    ) {
        super(fg, bg, bold, underline);
    }
    
    static create({ text, fg, bg, bold, underline }: { text:string; fg?: string; bg?: string; bold?: boolean; underline?: boolean }): StyledTextData {
        return new StyledTextData(text, fg, bg, bold, underline);
    }
    
    toStyle = (): StyledTextStyle => {
        const { fg, bg, bold, underline } = this;
        return new StyledTextStyle(fg, bg, bold, underline);
    }
}

export function writeAt(target: StyledTextData[], index: number, text: string) {
    var result: StyledTextData[] = target.map(x => ({...x} as StyledTextData))
    var lookat = 0;
    var datanum = -1;
    var charindex = -1;
    for (let i = 0; i < target.length; i++) {
        const item = target[i];
        if (index <= lookat + item.text.length - 1) {
            datanum = i;
            charindex = index - lookat; 
            break;
        }
        lookat += item.text.length;
    }
    if (datanum == -1 && index <= target[target.length-1].text.length - 1) {
        datanum = target.length-1;
        charindex = index - lookat;
    }
    result[datanum].text = result[datanum].text.slice(0, charindex) + text + result[datanum].text.slice(charindex, result[datanum].text.length)
    return result
}

export function writeAtRange(target: StyledTextData[], start: number, end: number, text: string) {
    var lookat_start = 0;
    var index_start = -1;
    var charindex_start = -1;
    for (let index = 0; index < target.length; index++) {
        const item = target[index];
        if (start <= lookat_start + item.text.length) { // Don't minus one because separoators between character is one more than charaters
            index_start = index;
            charindex_start = start - lookat_start; 
            break;
        }
        lookat_start += item.text.length;
    }
    if (index_start == -1 && start <= target[target.length-1].text.length) {
        index_start = target.length-1;
        charindex_start = start - lookat_start;
    }

    var lookat_end = 0;
    var index_end = -1;
    var charindex_end = -1;
    for (let index = 0; index < target.length; index++) {
        const item = target[index];
        if (end <= lookat_end + item.text.length) {
            index_end = index;
            charindex_end = end - lookat_end; 
            break;
        }
        lookat_end += item.text.length;
    }
    if (index_end == -1 && end <= target[target.length-1].text.length) {
        index_end = target.length-1;
        charindex_end = end - lookat_end;
    }
    var results: StyledTextData[] = [];
    target.forEach((value, index) => {
        var lineAdded = false;
        if (index_start == index) {
            results.push(Object.assign({...value} as StyledTextData, {text: value.text.slice(0, charindex_start) + text}));
            lineAdded = true;
        }
        if (index_start < index && index < index_end) {
            return;
        }
        if (index_end == index) {
            results.push(Object.assign(
                {...value} as StyledTextData,
                {text: value.text.slice(charindex_end, value.text.length)}
            ));
            lineAdded = true;
        }
        if (!lineAdded) {
            results.push({...value} as StyledTextData);
        }
    });


    return shortenDataOf(results);
}

function shortenDataOf(data: StyledTextData[]) {
    var result: StyledTextData[] = [];
    data.filter(value => value.text.length > 0).forEach(value => {
        if (result.length == 0) {
            result.push({...value} as StyledTextData);
            return;
        }
        if (value.toStyle().eqstyle(result[result.length-1].toStyle())
        ) result[result.length-1].text += value.text
        else result.push({...value} as StyledTextData)
    });
    return result;
}

export function applyStyle(start: number, end: number, style: StyledTextStyle, target: StyledTextData[]) {
    if (target.length == 0) throw Error("Length of target must longer than 1.")

    
    var lookat_start = 0;
    var index_start = -1;
    var charindex_start = -1;
    for (let index = 0; index < target.length; index++) {
        const item = target[index];
        if (start <= lookat_start + item.text.length - 1) {
            index_start = index;
            charindex_start = start - lookat_start; 
            break;
        }
        lookat_start += item.text.length;
    }
    if (index_start == -1 && start <= target[target.length-1].text.length - 1) {
        index_start = target.length-1;
        charindex_start = start - lookat_start;
    }

    var lookat_end = 0;
    var index_end = -1;
    var charindex_end = -1;
    for (let index = 0; index < target.length; index++) {
        const item = target[index];
        if (end <= lookat_end + item.text.length - 1) {
            index_end = index;
            charindex_end = end - lookat_end; 
            break;
        }
        lookat_end += item.text.length;
    }
    if (index_end == -1 && end <= target[target.length-1].text.length - 1) {
        index_end = target.length-1;
        charindex_end = end - lookat_end;
    }


    function removeUndefinedKeys(obj: any) {
        for (let key in obj) {
            if (obj[key] === undefined) {
                delete obj[key];
            }
        }
        return obj;
    }

    var results: StyledTextData[] = [];
    target.forEach((value, index) => {
        var lineAdded = false;
        if (index_start == index) {
            results.push(Object.assign({...value} as StyledTextData, {text: value.text.slice(0, charindex_start)}));
            if (index_start != index_end) 
                results.push(
                    Object.assign(
                        removeUndefinedKeys({...value}), 
                        {text:value.text.slice(charindex_start, value.text.length)}, 
                        removeUndefinedKeys({...style})
                    ));
            var lineAdded = true;
        }
        if (index_start < index && index < index_end) {
            results.push(Object.assign(
                removeUndefinedKeys({...value}), 
                removeUndefinedKeys({...style})
            ));
            return;
        }
        if (index_start == index && index_end == index) {
            var text = value.text.slice(charindex_start, charindex_end);
            results.push(Object.assign(
                removeUndefinedKeys({...value}), 
                {text: text},
                removeUndefinedKeys({...style})
            ));
        }
        if (index_end == index) {
            if (index_start != index_end) {
                var text = value.text.slice(0, charindex_end);
                results.push(Object.assign(
                    removeUndefinedKeys({...value}), 
                    {text: text},
                    removeUndefinedKeys({...style})
                ));
            }
            results.push(Object.assign(
                removeUndefinedKeys({...value}),
                {text: value.text.slice(charindex_end, value.text.length)}
            ));
            var lineAdded = true;
        }
        if (!lineAdded) {
            results.push(removeUndefinedKeys({...value}));
        }
    });

    results = results.map(x => StyledTextData.create(x));
    return shortenDataOf(results);
    
    
}

interface StyledTextPeiceProps extends React.HTMLProps<HTMLDivElement> {
    stdata: StyledTextData;
}

const StyledTextPeice: React.FC<StyledTextPeiceProps> = ({stdata, ...props}) => {
    props.style = {
        color: stdata.fg,
        backgroundColor: stdata.bg,

        textDecoration: (stdata.underline? "underline ":""),
        fontWeight: stdata.bold?"bold":"normal",

        ...props.style
    };
    return <p {...props}>{stdata.text}</p>
}

interface StyledTextProps extends React.HTMLProps<HTMLDivElement> {
    stdataList: StyledTextData[];
}
const StyledText: React.FC<StyledTextProps> = ({stdataList, ...props}) => {
    return <div {...props} className={"w-full flex flex-row" + props.className}>
        {
            stdataList.map((data, i) => 
                <StyledTextPeice key={"item-"+i} stdata={data} style={{

                    whiteSpace: "pre-wrap"
                }}/>
            )
        }
    </div>
}
export default StyledText;