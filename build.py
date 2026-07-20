#!/usr/bin/env python3
"""
build.py — يدمج محتوى assets/app.js جوه أول <script> في كل صفحة HTML.

الاستخدام:
    عدّل في assets/app.js زي ما انت متعود.
    شغّل: python3 build.py
    ارفع كل ملفات .html اللي اتحدّثت (+ مجلد assets) على Vercel.

الفكرة: بتشتغل على ملف واحد بس (assets/app.js) وقت التعديل،
والسكريبت هو اللي بيوزّع نسخة محدّثة جوه كل صفحة قبل الرفع —
عشان نتجنب مشكلة تحميل ملف .js خارجي من غير ما نضطر نعدّل 7 ملفات يدوي.
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent
APP_JS = ROOT / "assets" / "app.js"
PAGES = ["login.html", "sales.html", "support.html", "management.html", "report.html", "users.html", "clients.html", "settings.html"]

# نمط الإصدار: بيتزود رقم واحد كل مرة تشغّل فيها السكريبت، عشان يكسر أي كاش قديم
VERSION_PATTERN = re.compile(r"const APP_BUILD_VERSION = '([^']*)';")


def bump_version(app_js_text: str) -> str:
    match = VERSION_PATTERN.search(app_js_text)
    if not match:
        return app_js_text
    current = match.group(1)
    num_match = re.search(r"\d+", current)
    if num_match:
        new_num = int(num_match.group()) + 1
        new_version = f"v{new_num}"
    else:
        new_version = "v1"
    print(f"نسخة الكود: {current} → {new_version}")
    return VERSION_PATTERN.sub(f"const APP_BUILD_VERSION = '{new_version}';", app_js_text, count=1)


def main():
    if not APP_JS.exists():
        print("خطأ: مفيش ملف assets/app.js")
        sys.exit(1)

    app_js_text = APP_JS.read_text(encoding="utf-8")
    app_js_text = bump_version(app_js_text)
    APP_JS.write_text(app_js_text, encoding="utf-8")

    script_block_pattern = re.compile(r"<script[^>]*>.*?</script>", re.DOTALL)
    external_ref_pattern = re.compile(r'<script src="assets/app\.js(\?v=\d+)?"\s*defer\s*></script>')

    for page_name in PAGES:
        page_path = ROOT / page_name
        if not page_path.exists():
            print(f"تحذير: {page_name} مش موجود، اتجوّز")
            continue

        content = page_path.read_text(encoding="utf-8")
        new_block = f"<script defer>\n{app_js_text}\n</script>"

        if external_ref_pattern.search(content):
            # كان ملف خارجي — استبدله بنسخة مدمجة
            new_content = external_ref_pattern.sub(lambda m: new_block, content, count=1)
        else:
            # كان مدمج بالفعل من قبل — استبدل أول <script> بس
            match = script_block_pattern.search(content)
            if not match:
                print(f"تحذير: مفيش <script> في {page_name}")
                continue
            new_content = content[: match.start()] + new_block + content[match.end():]

        page_path.write_text(new_content, encoding="utf-8")
        print(f"تم تحديث {page_name}")

    print("\nخلصنا. راجع الملفات وارفعها على Vercel.")


if __name__ == "__main__":
    main()
