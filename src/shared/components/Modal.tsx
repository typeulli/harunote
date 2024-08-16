interface ModalProps extends React.HTMLProps<HTMLDivElement> {
    isOpen: boolean,
    onRequestClose: () => void
}

const Modal: React.FC<ModalProps> = ({
    isOpen, onRequestClose, children, ...props
}) => {
    return <div {...props}
    style={{
        display: isOpen ? 'block' : 'none',
        ...props.style,
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // semi-transparent background
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000, // ensure modal is on top
    }}
    className={`modal ${props.className}`}
    onKeyDown={e => {
        e.key=="esc" && onRequestClose();
        props.onKeyDown && props.onKeyDown(e);
    }}
>
    <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
    >
        {children}
    </div>
</div>
}

export default Modal;