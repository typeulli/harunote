import '@/styles/TabBox.scss'
import { CSSProperties } from 'react'

export function TabBox({
    className, style, select, onSelect, tabnames, children
} : {
    className?: string | undefined, style?: CSSProperties | undefined, select: number, onSelect: (key: number)=>void, tabnames: string[], children: React.ReactNode
}) {
    return <div className={"TabBox "+(className ?? "")} style={style}>
        <div className='TabMenuBar'>
            {tabnames.map((name, index) => 
                <button
                    className={'TabMenu'+(select==index? 'Selected':'UnSelected') + " select-none"}
                    key={`tabmenu-${index}`} 
                    onClick={() => {
                        if (select == index) onSelect(-1)
                        else onSelect(index)
                    }}
                >{name}</button>
            )}
        </div>
        <div className='TabMenuView select-none' style={(0 <= select && select <= tabnames.length-1)? {height:50} : {height:0}}>
            {(0 <= select && select <= tabnames.length-1)? children[select]:<></>}
        </div>
    </div>
}