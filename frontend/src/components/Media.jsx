// Built-in exercise demonstration media has been removed from PT650.
// Only private media explicitly added to custom exercises is rendered.
import CustomMedia, { CustomThumb } from './CustomMedia.jsx'
import Icon from './Icon.jsx'

export default function Media(props) {
  return props.ex?.custom ? <CustomMedia {...props} /> : null
}

export function Thumb(props) {
  if (props.ex?.custom) return <CustomThumb {...props} />
  return <div className="thumb thumb-x pt650-thumb" data-pt650-media="unavailable"><Icon name="dumbbell" /></div>
}
