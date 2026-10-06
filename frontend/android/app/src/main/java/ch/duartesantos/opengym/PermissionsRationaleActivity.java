package ch.duartesantos.opengym;

import android.app.Activity;
import android.os.Bundle;
import android.text.method.ScrollingMovementMethod;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * Health Connect permission rationale shown from the system privacy link.
 * Keep this copy aligned with PT650's published privacy policy before store release.
 */
public class PermissionsRationaleActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        int pad = Math.round(24 * getResources().getDisplayMetrics().density);
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(pad, pad, pad, pad);

        TextView title = new TextView(this);
        title.setText("PT650 Health Connect");
        title.setTextSize(24);
        title.setPadding(0, 0, 0, pad / 2);

        TextView body = new TextView(this);
        body.setText(
                "PT650 reads only the health and workout data you choose to grant through Health Connect.\n\n"
                + "Used in V1: weight, body fat, resting heart rate, HRV, oxygen saturation, "
                + "respiratory rate, body temperature, sleep sessions and exercise sessions.\n\n"
                + "PT650 does not request Health Connect route/location access, background health "
                + "access or extended history access in this version. Raw GPS routes are not stored "
                + "inside PT650 Health records.\n\n"
                + "Imported records keep their source provenance so PT650 can distinguish the original "
                + "provider and avoid destructive cross-source deduplication. You can revoke Health "
                + "Connect permissions at any time from Android settings.\n\n"
                + "These signals support training and personal tracking and are not medical diagnoses."
        );
        body.setTextSize(16);
        body.setMovementMethod(new ScrollingMovementMethod());

        layout.addView(title, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        layout.addView(body, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));

        setContentView(layout);
    }
}
