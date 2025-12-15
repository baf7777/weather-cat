
document.addEventListener('DOMContentLoaded', () => {
    
    // Функция запуска анимации раскачивания
    function ballBounce(element) {
        if (element.classList.contains("bounce")) {
            return;
        }
        toggleBounce(element);
    }
    
    // Цепочка добавления классов для анимации затухающего раскачивания
    function toggleBounce(element){
        element.classList.add("bounce");
        
        function n() {
            element.classList.remove("bounce");
            element.classList.add("bounce1");
            
            function o() {
                element.classList.remove("bounce1");
                element.classList.add("bounce2");
                
                function p() {
                    element.classList.remove("bounce2");
                    element.classList.add("bounce3");
                    
                    function q() {
                        element.classList.remove("bounce3");
                    }
                    setTimeout(q, 300);
                }
                setTimeout(p, 300);
            }
            setTimeout(o, 300);
        }
        setTimeout(n, 300);
    }
    
    // Находим все шарики и их "правые" части (блики/тени)
    const balls = document.querySelectorAll('.b-ball_bounce');
    const ballRights = document.querySelectorAll('.b-ball_bounce .b-ball__right');
    
    // Добавляем слушатели наведения мыши
    balls.forEach(ball => {
        ball.addEventListener('mouseenter', function() {
            ballBounce(this);
        });
    });
    
    ballRights.forEach(br => {
        br.addEventListener('mouseenter', function() {
            // Находим родительский шарик
            const parent = this.closest('.b-ball_bounce');
            if (parent) {
                ballBounce(parent);
            }
        });
    });

    // Также запускаем анимацию при клике на шарик (просто для фана)
    balls.forEach(ball => {
        ball.addEventListener('click', function() {
            ballBounce(this);
        });
    });
});
