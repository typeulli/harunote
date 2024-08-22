type StyledTextData = {
    text: string;

    colorfg?: string | null;
    colorbg?: string | null;
}
interface StyledTextProps extends React.HTMLProps<HTMLDivElement> {
    item: StyledTextData[];
}
const StyledText: React.FC<StyledTextProps> = ({item, ...props}) => {
    return <div {...props}>
        {
            item.map((data, i) => 
                <p key={"item-"+i} children={data.text} style={{
                    color: data.colorfg ?? "black",
                    backgroundColor: data.colorbg ?? "transparent",

                    whiteSpace: "pre-wrap"
                }}/>
            )
        }
    </div>
}
export default StyledText;