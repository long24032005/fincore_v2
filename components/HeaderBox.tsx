const HeaderBox = ({ type = "title", title, subtext, user }: HeaderBoxProps) => {
  return (
    <div className="header-box">
      <h1 className={type === 'greeting' ? 'text-30 font-normal text-white' : 'header-box-title'}>
        {title}
        {type === 'greeting' && (
          <span className="font-bold text-emerald-300" style={{
            textShadow: '0 0 10px rgba(16, 185, 129, 0.3), 0 0 20px rgba(16, 185, 129, 0.15)'
          }}>
            &nbsp;{user}
          </span>
        )}
      </h1>
      {subtext && <p className="header-box-subtext">{subtext}</p>}
    </div>
  )
}

export default HeaderBox